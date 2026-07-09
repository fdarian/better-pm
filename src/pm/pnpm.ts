import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect } from 'effect';
import { enumerateWorkspacePackages } from '#src/pm/package-manager-service.ts';
import type { CommandOverride } from '#src/project/config.ts';

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
					globs.push(match[1].trim().replace(/^["']|["']$/g, ''));
				}
			}
			return yield* enumerateWorkspacePackages(lockDir, globs);
		}),
	buildInstallCommand: (override?: CommandOverride) => {
		const bin = override?.bin ?? 'pnpm';
		const sub = override?.subcommand ?? ['install'];
		return ShellCommand.make(bin, ...sub);
	},
	buildFilteredInstallCommand: (
		filters: Array<string>,
		override?: CommandOverride,
	) => {
		const bin = override?.bin ?? 'pnpm';
		const sub = override?.subcommand ?? ['install'];
		const args: Array<string> = [];
		for (const f of filters) {
			args.push('-F', f);
		}
		args.push(...sub);
		return ShellCommand.make(bin, ...args);
	},
	buildAddCommand: (
		packages: Array<string>,
		dev: boolean,
		override?: CommandOverride,
	) => {
		const bin = override?.bin ?? 'pnpm';
		const sub = override?.subcommand ?? ['add'];
		const args: Array<string> = [...sub];
		if (dev) args.push('-D');
		args.push(...packages);
		return ShellCommand.make(bin, ...args);
	},
	buildRemoveCommand: (packages: Array<string>, override?: CommandOverride) => {
		const bin = override?.bin ?? 'pnpm';
		const sub = override?.subcommand ?? ['remove'];
		return ShellCommand.make(bin, ...sub, ...packages);
	},
	resolveInstallFilters: (_lockDir: string, packageName: string) =>
		Effect.succeed([`${packageName}...`]),
};
