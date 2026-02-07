import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect } from 'effect';
import { enumerateWorkspacePackages } from '#src/pm/package-manager-service.ts';

export const pnpmPackageManager = {
	name: 'pnpm',
	detectHasWorkspaces: (lockDir: string) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			return yield* fs.exists(path.join(lockDir, 'pnpm-workspace.yaml'));
		}),
	listWorkspacePackages: (lockDir: string) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const content = yield* fs.readFileString(
				path.join(lockDir, 'pnpm-workspace.yaml'),
			);
			const globs: Array<string> = [];
			for (const line of content.split('\n')) {
				const match = line.match(/^\s*-\s+(.+)$/);
				if (match) {
					globs.push(match[1].trim());
				}
			}
			return yield* enumerateWorkspacePackages(lockDir, globs);
		}),
	buildInstallCommand: () => ShellCommand.make('pnpm', 'install'),
	buildFilteredInstallCommand: (filters: Array<string>) => {
		const args: Array<string> = [];
		for (const f of filters) {
			args.push('-F', f);
		}
		args.push('install');
		return ShellCommand.make('pnpm', ...args);
	},
	buildAddCommand: (packages: Array<string>, dev: boolean) => {
		const args: Array<string> = ['add'];
		if (dev) args.push('-D');
		args.push(...packages);
		return ShellCommand.make('pnpm', ...args);
	},
	buildRemoveCommand: (packages: Array<string>) =>
		ShellCommand.make('pnpm', 'remove', ...packages),
	resolveInstallFilters: (_lockDir: string, packageName: string) =>
		Effect.succeed([`${packageName}...`]),
};
