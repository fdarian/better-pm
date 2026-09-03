import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { assembleFilteredArgv, type FilterSpec } from '#src/pm/filter-argv.ts';
import {
	collectWorkspaceDependencies,
	enumerateWorkspacePackages,
} from '#src/pm/package-manager-service.ts';
import type { CommandOverride } from '#src/project/config.ts';

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(Schema.Array(Schema.String)),
});

const filterSpec: FilterSpec = {
	flag: '-w',
	position: 'after-subcommand',
	supportsSelectorSyntax: false,
};

export const npmPackageManager = {
	name: 'npm',
	filterSpec,
	detectHasWorkspaces: (lockDir: string) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const pkgPath = path.join(lockDir, 'package.json');
			const exists = yield* fs.exists(pkgPath);
			if (!exists) return false;
			const content = yield* fs.readFileString(pkgPath);
			const pkg = yield* Schema.decode(
				Schema.parseJson(PackageJsonWithWorkspaces),
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
			const pkg = yield* Schema.decode(
				Schema.parseJson(PackageJsonWithWorkspaces),
			)(content);
			const globs = pkg.workspaces ?? [];
			return yield* enumerateWorkspacePackages(lockDir, globs);
		}),
	buildInstallCommand: (override?: CommandOverride) => {
		const bin = override?.bin ?? 'npm';
		const sub = override?.subcommand ?? ['install'];
		return ShellCommand.make(bin, ...sub);
	},
	buildFilteredInstallCommand: (
		filters: Array<string>,
		override?: CommandOverride,
	) =>
		Effect.gen(function* () {
			const bin = override?.bin ?? 'npm';
			const sub = override?.subcommand ?? ['install'];
			const args = yield* assembleFilteredArgv(filterSpec, sub, filters);
			return ShellCommand.make(bin, ...args);
		}),
	buildAddCommand: (
		packages: Array<string>,
		dev: boolean,
		filters: Array<string>,
		override?: CommandOverride,
	) =>
		Effect.gen(function* () {
			const bin = override?.bin ?? 'npm';
			const sub = override?.subcommand ?? ['install'];
			const trailingArgs = dev ? ['-D', ...packages] : packages;
			const args = yield* assembleFilteredArgv(
				filterSpec,
				sub,
				filters,
				trailingArgs,
			);
			return ShellCommand.make(bin, ...args);
		}),
	buildRemoveCommand: (
		packages: Array<string>,
		filters: Array<string>,
		override?: CommandOverride,
	) =>
		Effect.gen(function* () {
			const bin = override?.bin ?? 'npm';
			const sub = override?.subcommand ?? ['uninstall'];
			const args = yield* assembleFilteredArgv(
				filterSpec,
				sub,
				filters,
				packages,
			);
			return ShellCommand.make(bin, ...args);
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
