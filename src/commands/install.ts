import { Console, Effect, FileSystem, Path, Schema } from 'effect';
import { Command, Flag, Prompt } from 'effect/unstable/cli';
import pc from 'picocolors';
import { filterOption } from '#src/commands/filter-option.ts';
import { renderCommand } from '#src/commands/render-command.ts';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { formatWorkspaceTree } from '#src/lib/format-workspace-tree.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { loadConfig, resolveCommandOverride } from '#src/project/config.ts';
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
	const pkg = yield* Schema.decodeEffect(Schema.fromJsonString(PackageJson))(
		content,
	);
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

const sureOption = Flag.boolean('sure').pipe(
	Flag.withAlias('y'),
	Flag.withDefault(false),
);

export const shouldConfirmRootInstall = (opts: {
	ctx: MonorepoContext;
	sure: boolean;
	scopedInstall: boolean;
}) =>
	opts.ctx.type === 'root' &&
	opts.ctx.hasWorkspaces &&
	!opts.sure &&
	opts.scopedInstall;

export const confirmRootInstall = (args: {
	packages: Array<{ name: string; relDir: string }>;
	pathSep: string;
}) =>
	Effect.gen(function* () {
		yield* Console.log(
			'[WARNING] You are at the monorepo root. This will install ALL packages.',
		);
		yield* Console.log('');
		if (args.packages.length > 0) {
			yield* Console.log('Workspace packages:');
			for (const line of formatWorkspaceTree(args.packages, args.pathSep)) {
				yield* Console.log(line);
			}
			yield* Console.log('');
		}

		if (process.env.CLAUDECODE === '1') {
			yield* Console.log('To install a specific package:');
			yield* Console.log('  pm i -F <package-name>');
			yield* Console.log('');
			yield* Console.log('To install everything:');
			yield* Console.log('  pm i -y');
			return false;
		}

		const confirmed = yield* Prompt.confirm({
			message: 'Proceed with installing all packages?',
		}).pipe(Effect.catchTag('QuitError', () => Effect.succeed(false)));
		return confirmed;
	});

const installHandler = (args: {
	sure: boolean;
	filter: ReadonlyArray<string>;
}) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const ctx = yield* detectContext;
		const path = yield* Path.Path;
		const config = yield* loadConfig(ctx.lockDir);
		const installOverride = resolveCommandOverride(config, pm.name, 'install');
		const filters = Array.from(args.filter);

		if (filters.length > 0) {
			const cmd = yield* pm.buildFilteredInstallCommand(
				filters,
				installOverride,
			);
			yield* Console.log(
				`Running: ${pm.name} install with filters: ${filters.join(', ')} (cmd: ${pc.gray(renderCommand(cmd))})`,
			);
			yield* runShellCommand(cmd);
			return;
		}

		if (ctx.type === 'package' && config.scopedInstall) {
			const scopedFilters = yield* pm.resolveInstallFilters(
				ctx.lockDir,
				ctx.packageName,
			);
			const cmd = yield* pm.buildFilteredInstallCommand(
				scopedFilters,
				installOverride,
			);
			yield* Console.log(
				`Running ${pm.name} install filtered to ${scopedFilters.join(', ')} (cmd: ${pc.gray(renderCommand(cmd))})`,
			);
			yield* runShellCommand(cmd);
			return;
		}

		if (
			shouldConfirmRootInstall({
				ctx,
				sure: args.sure,
				scopedInstall: config.scopedInstall ?? false,
			})
		) {
			const packages = yield* pm.listWorkspacePackages(ctx.lockDir);
			const proceed = yield* confirmRootInstall({
				packages,
				pathSep: path.sep,
			});
			if (!proceed) return;
		}

		const cmd = pm.buildInstallCommand(installOverride);
		yield* Console.log(
			`Running ${pm.name} install (cmd: ${pc.gray(renderCommand(cmd))})`,
		);
		yield* runShellCommand(cmd);
	}).pipe(Effect.provide(PackageManagerLayer));

export const installCmd = Command.make(
	'i',
	{ sure: sureOption, filter: filterOption },
	installHandler,
);

export const installFullCmd = Command.make(
	'install',
	{ sure: sureOption, filter: filterOption },
	installHandler,
);
