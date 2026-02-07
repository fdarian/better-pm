import * as cli from '@effect/cli';
import { type Command, FileSystem, Path } from '@effect/platform';
import { Console, Effect, Schema } from 'effect';
import pc from 'picocolors';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { findUpward } from '#src/project/find-upward.ts';
import { formatWorkspaceTree } from '#src/lib/format-workspace-tree.ts';

type MonorepoContext =
	| {
			type: 'root';
			lockDir: string;
			hasWorkspaces: boolean;
	  }
	| {
			type: 'package';
			lockDir: string;
			packageName: string;
	  };

const PackageJson = Schema.Struct({
	name: Schema.String,
});

const findPackageJson = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const pkgPath = yield* findUpward('package.json').pipe(Effect.option);
	if (pkgPath._tag === 'None') {
		return null;
	}

	const content = yield* fs.readFileString(pkgPath.value);
	const pkg = yield* Schema.decode(Schema.parseJson(PackageJson))(content);
	return { dir: path.dirname(pkgPath.value), name: pkg.name };
});

const detectContext = Effect.gen(function* () {
	const path = yield* Path.Path;
	const pm = yield* PackageManagerService;
	const pkgResult = yield* findPackageJson;

	if (pkgResult === null) {
		const hasWorkspaces = yield* pm.detectHasWorkspaces(pm.lockDir);
		return {
			type: 'root',
			lockDir: pm.lockDir,
			hasWorkspaces,
		} as MonorepoContext;
	}

	const lockDirNormalized = path.normalize(pm.lockDir);
	const pkgDirNormalized = path.normalize(pkgResult.dir);

	if (
		lockDirNormalized !== pkgDirNormalized &&
		pkgDirNormalized.startsWith(lockDirNormalized)
	) {
		return {
			type: 'package',
			lockDir: pm.lockDir,
			packageName: pkgResult.name,
		} as MonorepoContext;
	}

	const hasWorkspaces = yield* pm.detectHasWorkspaces(pm.lockDir);
	return {
		type: 'root',
		lockDir: pm.lockDir,
		hasWorkspaces,
	} as MonorepoContext;
});

const sureOption = cli.Options.boolean('sure').pipe(
	cli.Options.withDefault(false),
);

const filterOption = cli.Options.text('filter').pipe(
	cli.Options.withAlias('F'),
	cli.Options.repeated,
);

const installHandler = (args: {
	sure: boolean;
	filter: ReadonlyArray<string>;
}) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const ctx = yield* detectContext;
		const path = yield* Path.Path;
		const filters = Array.from(args.filter);

		if (filters.length > 0) {
			const cmd = pm.buildFilteredInstallCommand(filters);
			yield* Console.log(
				`Running: ${pm.name} install with filters: ${filters.join(', ')} (cmd: ${pc.gray(renderCommand(cmd))})`,
			);
			yield* runShellCommand(cmd);
			return;
		}

		if (ctx.type === 'package') {
			const filters = yield* pm.resolveInstallFilters(ctx.lockDir, ctx.packageName);
			const cmd = pm.buildFilteredInstallCommand(filters);
			yield* Console.log(
				`Running ${pm.name} install filtered to ${filters.join(', ')} (cmd: ${pc.gray(renderCommand(cmd))})`,
			);
			yield* runShellCommand(cmd);
			return;
		}

		if (ctx.hasWorkspaces && !args.sure) {
			const packages = yield* pm.listWorkspacePackages(ctx.lockDir);
			yield* Console.log(
				'[WARNING] You are at the monorepo root. This will install ALL packages.',
			);
			yield* Console.log('');
			if (packages.length > 0) {
				yield* Console.log('Workspace packages:');
				for (const line of formatWorkspaceTree(packages, path.sep)) {
					yield* Console.log(line);
				}
				yield* Console.log('');
			}
			yield* Console.log('To install a specific package:');
			yield* Console.log(`  pm i -F <package-name>`);
			yield* Console.log('');
			yield* Console.log('To install everything:');
			yield* Console.log(`  pm i --sure`);
			return;
		}

		const cmd = pm.buildInstallCommand();
		yield* Console.log(
			`Running ${pm.name} install (cmd: ${pc.gray(renderCommand(cmd))})`,
		);
		yield* runShellCommand(cmd);
	}).pipe(Effect.provide(PackageManagerLayer));

export const installCmd = cli.Command.make(
	'i',
	{ sure: sureOption, filter: filterOption },
	installHandler,
);

export const installFullCmd = cli.Command.make(
	'install',
	{ sure: sureOption, filter: filterOption },
	installHandler,
);

// Minimal quoting helper (POSIX-ish; adjust for Windows / your needs)
const shQuote = (s: string) =>
	/^[A-Za-z0-9_./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;

function renderCommand(cmd: Command.Command): string {
	// Turn it into a plain JSON-ish object using the representation
	const j = JSON.parse(JSON.stringify(cmd)) as any;

	// Inspect the shape once in your project and adapt these field names:
	// common shapes are like { command: "ls", args: ["-al"] } or similar.
	const bin: string = j.command ?? j.name ?? j.process ?? '<unknown>';
	const args: string[] = j.args ?? j.arguments ?? [];

	return [bin, ...args].map(shQuote).join(' ');
}
