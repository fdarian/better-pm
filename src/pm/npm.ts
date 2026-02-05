import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { enumerateWorkspacePackages } from '#src/pm/package-manager-service.ts';

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(Schema.Array(Schema.String)),
});

export const npmPackageManager = {
	name: 'npm',
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
	buildInstallCommand: () => ShellCommand.make('npm', 'install'),
	buildFilteredInstallCommand: (filters: Array<string>) => {
		const args: Array<string> = ['install'];
		for (const f of filters) {
			args.push('-w', f);
		}
		return ShellCommand.make('npm', ...args);
	},
	buildAddCommand: (packages: Array<string>, dev: boolean) => {
		const args: Array<string> = ['install'];
		if (dev) args.push('-D');
		args.push(...packages);
		return ShellCommand.make('npm', ...args);
	},
	buildRemoveCommand: (packages: Array<string>) =>
		ShellCommand.make('npm', 'uninstall', ...packages),
};
