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

const PM_NAME = 'nub';

const filterSpec: FilterSpec = {
	flag: '-F',
	position: 'before-subcommand',
	supportsSelectorSyntax: true,
	// nub mirrors pnpm's -F surface, including the `link` gap.
	unsupportedOperations: new Set(['link']),
};

export const nubPackageManager = {
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
	buildInstallCommand: () => ShellCommand.make(PM_NAME, 'install'),
	buildFilteredInstallCommand: (filters: Array<string>) =>
		Effect.gen(function* () {
			const args = yield* assembleFilteredArgv(
				filterSpec,
				PM_NAME,
				'install',
				['install'],
				filters,
			);
			return ShellCommand.make(PM_NAME, ...args);
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
				PM_NAME,
				'add',
				['add'],
				filters,
				trailingArgs,
			);
			return ShellCommand.make(PM_NAME, ...args);
		}),
	buildRemoveCommand: (packages: Array<string>, filters: Array<string>) =>
		Effect.gen(function* () {
			const args = yield* assembleFilteredArgv(
				filterSpec,
				PM_NAME,
				'remove',
				['remove'],
				filters,
				packages,
			);
			return ShellCommand.make(PM_NAME, ...args);
		}),
	resolveInstallFilters: (_lockDir: string, packageName: string) =>
		Effect.succeed([`${packageName}...`]),
};
