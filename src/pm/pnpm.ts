import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect } from 'effect';
import { assembleFilteredArgv, type FilterSpec } from '#src/pm/filter-argv.ts';
import { enumerateWorkspacePackages } from '#src/pm/package-manager-service.ts';
import type { CommandOverride } from '#src/project/config.ts';

const PM_NAME = 'pnpm';

const filterSpec: FilterSpec = {
	flag: '-F',
	position: 'before-subcommand',
	supportsSelectorSyntax: true,
	// Verified against the real binary: `pnpm -F <sel> link` errors.
	unsupportedOperations: new Set(['link']),
};

export const pnpmPackageManager = {
	name: PM_NAME,
	filterSpec,
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
		const bin = override?.bin ?? PM_NAME;
		const sub = override?.subcommand ?? ['install'];
		return ShellCommand.make(bin, ...sub);
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
			return ShellCommand.make(bin, ...args);
		}),
	buildAddCommand: (
		packages: Array<string>,
		dev: boolean,
		filters: Array<string>,
		override?: CommandOverride,
	) =>
		Effect.gen(function* () {
			const bin = override?.bin ?? PM_NAME;
			const sub = override?.subcommand ?? ['add'];
			const trailingArgs = dev ? ['-D', ...packages] : packages;
			const args = yield* assembleFilteredArgv(
				filterSpec,
				PM_NAME,
				'add',
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
			const bin = override?.bin ?? PM_NAME;
			const sub = override?.subcommand ?? ['remove'];
			const args = yield* assembleFilteredArgv(
				filterSpec,
				PM_NAME,
				'remove',
				sub,
				filters,
				packages,
			);
			return ShellCommand.make(bin, ...args);
		}),
	resolveInstallFilters: (_lockDir: string, packageName: string) =>
		Effect.succeed([`${packageName}...`]),
};
