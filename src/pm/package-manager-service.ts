import { FileSystem, Path, Command as ShellCommand } from '@effect/platform';
import type { PlatformError } from '@effect/platform/Error';
import type { ParseError } from 'effect/ParseResult';
import { Context, Effect, Schema } from 'effect';

export class PackageManagerService extends Context.Tag('PackageManagerService')<
	PackageManagerService,
	{
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
	}
>() {}

const WorkspacePackageJson = Schema.Struct({
	name: Schema.String,
});

export const enumerateWorkspacePackages = (lockDir: string, globs: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const packages: Array<{ name: string; relDir: string }> = [];

		for (const glob of globs) {
			const isGlobPattern = /\/\*+$/.test(glob);
			const baseDir = glob.replace(/\/\*+$/, '');
			const fullBase = path.join(lockDir, baseDir);
			const exists = yield* fs.exists(fullBase);
			if (!exists) continue;

			if (isGlobPattern) {
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
						packages.push({ name: decoded.value.name, relDir: path.join(baseDir, entry) });
					}
				}
			} else {
				const pkgJsonPath = path.join(fullBase, 'package.json');
				const pkgExists = yield* fs.exists(pkgJsonPath);
				if (!pkgExists) continue;

				const content = yield* fs.readFileString(pkgJsonPath);
				const decoded = yield* Schema.decode(
					Schema.parseJson(WorkspacePackageJson),
				)(content).pipe(Effect.option);
				if (decoded._tag === 'Some') {
					packages.push({ name: decoded.value.name, relDir: baseDir });
				}
			}
		}

		return packages;
	});
