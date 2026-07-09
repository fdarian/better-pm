import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Effect, Schema } from 'effect';
import {
	collectWorkspaceDependencies,
	enumerateWorkspacePackages,
	PackageJsonWorkspacesField,
} from '#src/pm/package-manager-service.ts';
import type { CommandOverride } from '#src/project/config.ts';

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(PackageJsonWorkspacesField),
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
		const bin = override?.bin ?? 'bun';
		const sub = override?.subcommand ?? ['install'];
		return ShellCommand.make(bin, ...sub);
	},
	buildFilteredInstallCommand: (
		filters: Array<string>,
		override?: CommandOverride,
	) => {
		const bin = override?.bin ?? 'bun';
		const sub = override?.subcommand ?? ['install'];
		const args: Array<string> = [...sub];
		for (const f of filters) {
			args.push('--filter', f);
		}
		return ShellCommand.make(bin, ...args);
	},
	buildAddCommand: (
		packages: Array<string>,
		dev: boolean,
		override?: CommandOverride,
	) => {
		const bin = override?.bin ?? 'bun';
		const sub = override?.subcommand ?? ['add'];
		const args: Array<string> = [...sub];
		if (dev) args.push('-D');
		args.push(...packages);
		return ShellCommand.make(bin, ...args);
	},
	buildRemoveCommand: (packages: Array<string>, override?: CommandOverride) => {
		const bin = override?.bin ?? 'bun';
		const sub = override?.subcommand ?? ['remove'];
		return ShellCommand.make(bin, ...sub, ...packages);
	},
	resolveInstallFilters: (lockDir: string, packageName: string) =>
		Effect.gen(function* () {
			const allPackages =
				yield* bunPackageManager.listWorkspacePackages(lockDir);
			return yield* collectWorkspaceDependencies(
				lockDir,
				packageName,
				allPackages,
			);
		}),
};
