import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect, Schema } from 'effect';
import {
	enumerateWorkspacePackages,
	PackageJsonWorkspacesField,
} from '#src/pm/package-manager-service.ts';

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(PackageJsonWorkspacesField),
});

export const nubPackageManager = {
	name: 'nub',
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
	buildFilteredInstallCommand: (filters: Array<string>) => {
		const args: Array<string> = [];
		for (const f of filters) {
			args.push('-F', f);
		}
		args.push('install');
		return ShellCommand.make('nub', ...args);
	},
	buildAddCommand: (packages: Array<string>, dev: boolean) => {
		const args: Array<string> = ['add'];
		if (dev) args.push('-D');
		args.push(...packages);
		return ShellCommand.make('nub', ...args);
	},
	buildRemoveCommand: (packages: Array<string>) =>
		ShellCommand.make('nub', 'remove', ...packages),
	resolveInstallFilters: (_lockDir: string, packageName: string) =>
		Effect.succeed([`${packageName}...`]),
};
