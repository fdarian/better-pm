import * as cli from '@effect/cli';
import { FileSystem, Path } from '@effect/platform';
import { Console, Effect, Schema } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { detectPackageManager } from '#src/pm/detect.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { findUpward } from '#src/project/find-upward.ts';

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
	const pmResult = yield* detectPackageManager;
	const pkgResult = yield* findPackageJson;

	if (pkgResult === null) {
		const hasWorkspaces = yield* pm.detectHasWorkspaces(pmResult.lockDir);
		return {
			type: 'root',
			lockDir: pmResult.lockDir,
			hasWorkspaces,
		} as MonorepoContext;
	}

	const lockDirNormalized = path.normalize(pmResult.lockDir);
	const pkgDirNormalized = path.normalize(pkgResult.dir);

	if (
		lockDirNormalized !== pkgDirNormalized &&
		pkgDirNormalized.startsWith(lockDirNormalized)
	) {
		return {
			type: 'package',
			lockDir: pmResult.lockDir,
			packageName: pkgResult.name,
		} as MonorepoContext;
	}

	const hasWorkspaces = yield* pm.detectHasWorkspaces(pmResult.lockDir);
	return {
		type: 'root',
		lockDir: pmResult.lockDir,
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

const formatWorkspaceTree = (
	packages: Array<{ name: string; relDir: string }>,
	sep: string,
) => {
	const grouped = new Map<string, Array<{ name: string; dirName: string }>>();
	for (const pkg of packages) {
		const parts = pkg.relDir.split(sep);
		const group = parts[0];
		const dirName = parts.slice(1).join(sep);
		if (!grouped.has(group)) {
			grouped.set(group, []);
		}
		grouped.get(group)!.push({ name: pkg.name, dirName });
	}

	const lines: Array<string> = [];
	const groupEntries = Array.from(grouped.entries());
	for (let gi = 0; gi < groupEntries.length; gi++) {
		const [group, entries] = groupEntries[gi];
		const isLastGroup = gi === groupEntries.length - 1;
		const groupPrefix = isLastGroup ? '└── ' : '├── ';
		const childIndent = isLastGroup ? '    ' : '│   ';
		lines.push(`${groupPrefix}${group}/`);
		for (let ei = 0; ei < entries.length; ei++) {
			const entry = entries[ei];
			const isLastEntry = ei === entries.length - 1;
			const entryPrefix = isLastEntry ? '└── ' : '├── ';
			lines.push(
				`${childIndent}${entryPrefix}${entry.dirName} "${entry.name}"`,
			);
		}
	}
	return lines;
};

export const installCmd = cli.Command.make(
	'i',
	{ sure: sureOption, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const ctx = yield* detectContext;
			const path = yield* Path.Path;
			const filters = Array.from(args.filter);

			if (filters.length > 0) {
				const cmd = pm.buildFilteredInstallCommand(filters);
				yield* Console.log(
					`Running: ${pm.name} install with filters: ${filters.join(', ')}`,
				);
				yield* runShellCommand(cmd);
				return;
			}

			if (ctx.type === 'package') {
				const cmd = pm.buildFilteredInstallCommand([ctx.packageName]);
				yield* Console.log(
					`Running: ${pm.name} install filtered to ${ctx.packageName}`,
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
				yield* Console.log(
					'  pm i -F <package-name>... (note: the trailing "..." meant to include all sub-dependencies)',
				);
				yield* Console.log('');
				yield* Console.log('To install everything:');
				yield* Console.log(`  pm i --sure`);
				return;
			}

			yield* Console.log(`Running: ${pm.name} install`);
			yield* runShellCommand(pm.buildInstallCommand());
		}),
);
