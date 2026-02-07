import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { collectWorkspaceDependencies, enumerateWorkspacePackages } from '#src/pm/package-manager-service.ts';

const WorkspacesField = Schema.Union(
	Schema.Array(Schema.String),
	Schema.transform(
		Schema.Struct({ packages: Schema.Array(Schema.String) }),
		Schema.Array(Schema.String),
		{ decode: (obj) => obj.packages, encode: (arr) => ({ packages: arr }) },
	),
);

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(WorkspacesField),
});

export const bunPackageManager = {
	name: 'bun',
	detectHasWorkspaces: (lockDir: string) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const pkgPath = path.join(lockDir, 'package.json');
			const exists = yield* fs.exists(pkgPath);
			if (!exists) return false;
			const content = yield* fs.readFileString(pkgPath);
			const pkg = yield* Schema.decode(Schema.parseJson(PackageJsonWithWorkspaces))(content);
			return pkg.workspaces !== undefined && pkg.workspaces.length > 0;
		}),
	listWorkspacePackages: (lockDir: string) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const content = yield* fs.readFileString(path.join(lockDir, 'package.json'));
			const pkg = yield* Schema.decode(Schema.parseJson(PackageJsonWithWorkspaces))(content);
			const globs = pkg.workspaces ?? [];
			return yield* enumerateWorkspacePackages(lockDir, globs);
		}),
	buildInstallCommand: () => ShellCommand.make('bun', 'install'),
	buildFilteredInstallCommand: (filters: Array<string>) => {
		const args: Array<string> = ['install'];
		for (const f of filters) {
			args.push('--filter', f);
		}
		return ShellCommand.make('bun', ...args);
	},
	buildAddCommand: (packages: Array<string>, dev: boolean) => {
		const args: Array<string> = ['add'];
		if (dev) args.push('-D');
		args.push(...packages);
		return ShellCommand.make('bun', ...args);
	},
	buildRemoveCommand: (packages: Array<string>) =>
		ShellCommand.make('bun', 'remove', ...packages),
	resolveInstallFilters: (lockDir: string, packageName: string) =>
		Effect.gen(function* () {
			const allPackages = yield* bunPackageManager.listWorkspacePackages(lockDir);
			return yield* collectWorkspaceDependencies(lockDir, packageName, allPackages);
		}),
};
