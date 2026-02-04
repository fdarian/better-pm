import * as cli from '@effect/cli';
import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import { Console, Effect, Schema } from 'effect';
import { NoPackageManagerDetectedError } from '#src/lib/errors.ts';
import { findUpward } from '#src/project/find-upward.ts';

type PackageManager = 'pnpm' | 'bun';

type MonorepoContext =
	| {
			type: 'root';
			pm: PackageManager;
			lockDir: string;
			hasWorkspaces: boolean;
	  }
	| {
			type: 'package';
			pm: PackageManager;
			lockDir: string;
			packageName: string;
	  };

const LOCK_FILES: Array<{ file: string; pm: PackageManager }> = [
	{ file: 'pnpm-lock.yaml', pm: 'pnpm' },
	{ file: 'bun.lock', pm: 'bun' },
	{ file: 'bun.lockb', pm: 'bun' },
];

const findLockFile = Effect.gen(function* () {
	const path = yield* Path.Path;

	for (const lockFile of LOCK_FILES) {
		const result = yield* findUpward(lockFile.file).pipe(
			Effect.map((lockPath) => ({
				pm: lockFile.pm,
				lockDir: path.dirname(lockPath),
			})),
			Effect.option,
		);
		if (result._tag === 'Some') {
			return result.value;
		}
	}
	return yield* Effect.fail(new NoPackageManagerDetectedError());
});

const PackageJson = Schema.Struct({
	name: Schema.String,
});

const PackageJsonWithWorkspaces = Schema.Struct({
	workspaces: Schema.optional(Schema.Array(Schema.String)),
});

const findPackageJson = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const pkgPath = yield* findUpward('package.json').pipe(Effect.option);
	if (pkgPath._tag === 'None') {
		return null;
	}

	const content = yield* fs.readFileString(pkgPath.value);
	const pkg = yield* Schema.decode(Schema.parseJson(PackageJson))(content);
	return { dir: path.dirname(pkgPath.value), name: pkg.name };
});

const detectHasWorkspaces = (lockDir: string, pm: PackageManager) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;

		if (pm === 'pnpm') {
			return yield* fs.exists(path.join(lockDir, 'pnpm-workspace.yaml'));
		}

		// bun: check package.json workspaces field
		const pkgPath = path.join(lockDir, 'package.json');
		const exists = yield* fs.exists(pkgPath);
		if (!exists) return false;

		const content = yield* fs.readFileString(pkgPath);
		const pkg = yield* Schema.decode(
			Schema.parseJson(PackageJsonWithWorkspaces),
		)(content);
		return pkg.workspaces !== undefined && pkg.workspaces.length > 0;
	});

const detectContext = Effect.gen(function* () {
	const path = yield* Path.Path;
	const lockResult = yield* findLockFile;
	const pkgResult = yield* findPackageJson;

	if (pkgResult === null) {
		const hasWorkspaces = yield* detectHasWorkspaces(
			lockResult.lockDir,
			lockResult.pm,
		);
		return {
			type: 'root',
			pm: lockResult.pm,
			lockDir: lockResult.lockDir,
			hasWorkspaces,
		} as MonorepoContext;
	}

	const lockDirNormalized = path.normalize(lockResult.lockDir);
	const pkgDirNormalized = path.normalize(pkgResult.dir);

	if (
		lockDirNormalized !== pkgDirNormalized &&
		pkgDirNormalized.startsWith(lockDirNormalized)
	) {
		return {
			type: 'package',
			pm: lockResult.pm,
			lockDir: lockResult.lockDir,
			packageName: pkgResult.name,
		} as MonorepoContext;
	}

	const hasWorkspaces = yield* detectHasWorkspaces(
		lockResult.lockDir,
		lockResult.pm,
	);
	return {
		type: 'root',
		pm: lockResult.pm,
		lockDir: lockResult.lockDir,
		hasWorkspaces,
	} as MonorepoContext;
});

const WorkspacePackageJson = Schema.Struct({
	name: Schema.String,
});

const listWorkspacePackages = (lockDir: string, pm: PackageManager) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const names: Array<string> = [];

		let globs: ReadonlyArray<string> = [];

		if (pm === 'pnpm') {
			const content = yield* fs.readFileString(
				path.join(lockDir, 'pnpm-workspace.yaml'),
			);
			const parsed: Array<string> = [];
			// Simple YAML parse for packages array — lines like "  - packages/*"
			for (const line of content.split('\n')) {
				const match = line.match(/^\s*-\s+(.+)$/);
				if (match) {
					parsed.push(match[1].trim());
				}
			}
			globs = parsed;
		} else {
			const content = yield* fs.readFileString(
				path.join(lockDir, 'package.json'),
			);
			const pkg = yield* Schema.decode(
				Schema.parseJson(PackageJsonWithWorkspaces),
			)(content);
			globs = pkg.workspaces ?? [];
		}

		for (const glob of globs) {
			// Strip trailing /* or /** to get the base directory
			const baseDir = glob.replace(/\/\*+$/, '');
			const fullBase = path.join(lockDir, baseDir);
			const exists = yield* fs.exists(fullBase);
			if (!exists) continue;

			const entries = yield* fs.readDirectory(fullBase);
			for (const entry of entries) {
				const pkgJsonPath = path.join(fullBase, entry, 'package.json');
				const pkgExists = yield* fs.exists(pkgJsonPath);
				if (!pkgExists) continue;

				const content = yield* fs.readFileString(pkgJsonPath);
				const decoded = yield* Schema.decode(
					Schema.parseJson(WorkspacePackageJson),
				)(content).pipe(Effect.option);
				if (decoded._tag === 'Some') {
					names.push(decoded.value.name);
				}
			}
		}

		return names;
	});

const runShellCommand = (cmd: ShellCommand.Command) =>
	Effect.scoped(
		Effect.gen(function* () {
			const process = yield* cmd.pipe(
				ShellCommand.stdin('inherit'),
				ShellCommand.stdout('inherit'),
				ShellCommand.stderr('inherit'),
				ShellCommand.start,
			);
			return yield* process.exitCode;
		}),
	);

const buildFilteredCommand = (pm: PackageManager, filters: Array<string>) => {
	if (pm === 'pnpm') {
		const args: Array<string> = [];
		for (const f of filters) {
			args.push('-F', `${f}...`);
		}
		args.push('install');
		return ShellCommand.make('pnpm', ...args);
	}
	// bun
	const args: Array<string> = ['install'];
	for (const f of filters) {
		args.push('--filter', `${f}...`);
	}
	return ShellCommand.make('bun', ...args);
};

const sureOption = cli.Options.boolean('sure').pipe(
	cli.Options.withDefault(false),
);

const filterOption = cli.Options.text('filter').pipe(
	cli.Options.withAlias('F'),
	cli.Options.repeated,
);

export const installCmd = cli.Command.make(
	'i',
	{ sure: sureOption, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const ctx = yield* detectContext;
			const filters = Array.from(args.filter);

			// --filter provided: run install with those filters
			if (filters.length > 0) {
				const cmd = buildFilteredCommand(ctx.pm, filters);
				yield* Console.log(
					`Running: ${ctx.pm} install with filters: ${filters.join(', ')}`,
				);
				yield* runShellCommand(cmd);
				return;
			}

			// Package context: auto-filter to current package
			if (ctx.type === 'package') {
				const cmd = buildFilteredCommand(ctx.pm, [ctx.packageName]);
				yield* Console.log(
					`Running: ${ctx.pm} install filtered to ${ctx.packageName}`,
				);
				yield* runShellCommand(cmd);
				return;
			}

			// Root context with workspaces and no --sure: warn and exit
			if (ctx.hasWorkspaces && !args.sure) {
				const packages = yield* listWorkspacePackages(ctx.lockDir, ctx.pm);
				yield* Console.log(
					'You are at the monorepo root. This will install ALL packages.',
				);
				yield* Console.log('');
				if (packages.length > 0) {
					yield* Console.log('Workspace packages:');
					for (const name of packages) {
						yield* Console.log(`  - ${name}`);
					}
					yield* Console.log('');
				}
				yield* Console.log('To install a specific package:');
				yield* Console.log('  pm i -F <package-name>... (note: The "..." is recommended to include all sub-dependencies)');
				yield* Console.log('');
				yield* Console.log('To install everything:');
				yield* Console.log(`  pm i --sure`);
				return;
			}

			// Root context with --sure or no workspaces: plain install
			yield* Console.log(`Running: ${ctx.pm} install`);
			yield* runShellCommand(ShellCommand.make(ctx.pm, 'install'));
		}),
);
