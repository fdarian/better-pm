import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import type { PlatformError } from '@effect/platform/Error';
import type { ParseError } from 'effect/ParseResult';
import { Context, Effect, Schema } from 'effect';

export class PackageManagerService extends Context.Tag('PackageManagerService')<
	PackageManagerService,
	{
		readonly lockDir: string;
		readonly name: string;
		readonly detectHasWorkspaces: (
			lockDir: string,
		) => Effect.Effect<boolean, PlatformError | ParseError, FileSystem.FileSystem | Path.Path>;
		readonly listWorkspacePackages: (
			lockDir: string,
		) => Effect.Effect<
			Array<{ name: string; relDir: string }>,
			PlatformError | ParseError,
			FileSystem.FileSystem | Path.Path
		>;
		readonly buildInstallCommand: () => ShellCommand.Command;
		readonly buildFilteredInstallCommand: (filters: Array<string>) => ShellCommand.Command;
		readonly buildAddCommand: (packages: Array<string>, dev: boolean) => ShellCommand.Command;
		readonly buildRemoveCommand: (packages: Array<string>) => ShellCommand.Command;
	}
>() {}

const WorkspacePackageJson = Schema.Struct({
	name: Schema.String,
});

const readPackageName = (pkgJsonPath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const content = yield* fs.readFileString(pkgJsonPath);
		return yield* Schema.decode(Schema.parseJson(WorkspacePackageJson))(content);
	}).pipe(Effect.option);

export const enumerateWorkspacePackages = (lockDir: string, globs: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;

		const tasks = globs.flatMap((glob) => {
			const isGlobPattern = /\/\*+$/.test(glob);
			const baseDir = glob.replace(/\/\*+$/, '');
			const fullBase = path.join(lockDir, baseDir);

			if (isGlobPattern) {
				return [
					Effect.gen(function* () {
						const entries = yield* Effect.option(fs.readDirectory(fullBase));
						if (entries._tag === 'None') return [];
						const entryTasks = entries.value.map((entry) =>
							Effect.gen(function* () {
								const pkgJsonPath = path.join(fullBase, entry, 'package.json');
								const decoded = yield* readPackageName(pkgJsonPath);
								if (decoded._tag === 'None') return [];
								return [{ name: decoded.value.name, relDir: path.join(baseDir, entry) }];
							}),
						);
						const results = yield* Effect.all(entryTasks, { concurrency: 'unbounded' });
						return results.flat();
					}),
				];
			}

			return [
				Effect.gen(function* () {
					const pkgJsonPath = path.join(fullBase, 'package.json');
					const decoded = yield* readPackageName(pkgJsonPath);
					if (decoded._tag === 'None') return [];
					return [{ name: decoded.value.name, relDir: baseDir }];
				}),
			];
		});

		const results = yield* Effect.all(tasks, { concurrency: 'unbounded' });
		return results.flat();
	});
