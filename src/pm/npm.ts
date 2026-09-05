import { Effect, FileSystem, Path, Schema } from 'effect';
import { ChildProcess } from 'effect/unstable/process';
import { assembleFilteredArgv, type FilterSpec } from '#src/pm/filter-argv.ts';
import {
	collectWorkspaceDependencies,
	enumerateWorkspacePackages,
} from '#src/pm/package-manager-service.ts';
import type { CommandOverride } from '#src/project/config.ts';

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(Schema.Array(Schema.String)),
});

const PM_NAME = 'npm';

const filterSpec: FilterSpec = {
	flag: '-w',
	position: 'after-subcommand',
	supportsSelectorSyntax: false,
	// Verified against the real binary: npm's -w works on every operation we
	// expose it on. `why` isn't in this set because why.ts already refuses to
	// run at all for npm, so this is never consulted for that operation.
	unsupportedOperations: new Set(),
};

export const npmPackageManager = {
	name: PM_NAME,
	filterSpec,
	detectHasWorkspaces: (lockDir: string) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const pkgPath = path.join(lockDir, 'package.json');
			const exists = yield* fs.exists(pkgPath);
			if (!exists) return false;
			const content = yield* fs.readFileString(pkgPath);
			const pkg = yield* Schema.decodeEffect(
				Schema.fromJsonString(PackageJsonWithWorkspaces),
			)(content);
			return pkg.workspaces !== undefined && pkg.workspaces.length > 0;
		}),
	listWorkspacePackages: (lockDir: string) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const content = yield* fs.readFileString(
				path.join(lockDir, 'package.json'),
			);
			const pkg = yield* Schema.decodeEffect(
				Schema.fromJsonString(PackageJsonWithWorkspaces),
			)(content);
			const globs = pkg.workspaces ?? [];
			return yield* enumerateWorkspacePackages(lockDir, globs);
		}),
	buildInstallCommand: (override?: CommandOverride) => {
		const bin = override?.bin ?? PM_NAME;
		const sub = override?.subcommand ?? ['install'];
		return ChildProcess.make(bin, sub);
	},
	buildFilteredInstallCommand: (
		filters: Array<string>,
		override?: CommandOverride,
	) =>
		Effect.gen(function* () {
			const bin = override?.bin ?? PM_NAME;
			const sub = override?.subcommand ?? ['install'];
			const args = yield* assembleFilteredArgv(
				filterSpec,
				PM_NAME,
				'install',
				sub,
				filters,
			);
			return ChildProcess.make(bin, args);
		}),
	buildAddCommand: (
		packages: Array<string>,
		dev: boolean,
		filters: Array<string>,
		override?: CommandOverride,
	) =>
		Effect.gen(function* () {
			const bin = override?.bin ?? PM_NAME;
			const sub = override?.subcommand ?? ['install'];
			const trailingArgs = dev ? ['-D', ...packages] : packages;
			const args = yield* assembleFilteredArgv(
				filterSpec,
				PM_NAME,
				'add',
				sub,
				filters,
				trailingArgs,
			);
			return ChildProcess.make(bin, args);
		}),
	buildRemoveCommand: (
		packages: Array<string>,
		filters: Array<string>,
		override?: CommandOverride,
	) =>
		Effect.gen(function* () {
			const bin = override?.bin ?? PM_NAME;
			const sub = override?.subcommand ?? ['uninstall'];
			const args = yield* assembleFilteredArgv(
				filterSpec,
				PM_NAME,
				'remove',
				sub,
				filters,
				packages,
			);
			return ChildProcess.make(bin, args);
		}),
	resolveInstallFilters: (lockDir: string, packageName: string) =>
		Effect.gen(function* () {
			const allPackages =
				yield* npmPackageManager.listWorkspacePackages(lockDir);
			return yield* collectWorkspaceDependencies(
				lockDir,
				packageName,
				allPackages,
			);
		}),
};
