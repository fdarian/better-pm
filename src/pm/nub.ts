import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { assembleFilteredArgv, type FilterSpec } from '#src/pm/filter-argv.ts';
import {
	enumerateWorkspacePackages,
	PackageJsonWorkspacesField,
} from '#src/pm/package-manager-service.ts';

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(PackageJsonWorkspacesField),
});

const filterSpec: FilterSpec = {
	flag: '-F',
	position: 'before-subcommand',
	supportsSelectorSyntax: true,
};

export const nubPackageManager = {
	name: 'nub',
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
	buildInstallCommand: () => ShellCommand.make('nub', 'install'),
	buildFilteredInstallCommand: (filters: Array<string>) =>
		Effect.gen(function* () {
			const args = yield* assembleFilteredArgv(
				filterSpec,
				['install'],
				filters,
			);
			return ShellCommand.make('nub', ...args);
		}),
	buildAddCommand: (
		packages: Array<string>,
		dev: boolean,
		filters: Array<string>,
	) =>
		Effect.gen(function* () {
			const trailingArgs = dev ? ['-D', ...packages] : packages;
			const args = yield* assembleFilteredArgv(
				filterSpec,
				['add'],
				filters,
				trailingArgs,
			);
			return ShellCommand.make('nub', ...args);
		}),
	buildRemoveCommand: (packages: Array<string>, filters: Array<string>) =>
		Effect.gen(function* () {
			const args = yield* assembleFilteredArgv(
				filterSpec,
				['remove'],
				filters,
				packages,
			);
			return ShellCommand.make('nub', ...args);
		}),
	resolveInstallFilters: (_lockDir: string, packageName: string) =>
		Effect.succeed([`${packageName}...`]),
};
