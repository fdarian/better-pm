import {
	Context,
	Effect,
	FileSystem,
	Path,
	type PlatformError,
	Schema,
	SchemaTransformation,
} from 'effect';
import type { ChildProcess } from 'effect/unstable/process';
import type {
	UnsupportedFilterOperationError,
	UnsupportedFilterSelectorError,
} from '#src/lib/errors.ts';
import type { FilterSpec } from '#src/pm/filter-argv.ts';
import type { CommandOverride } from '#src/project/config.ts';

type FilterCommandError =
	| UnsupportedFilterSelectorError
	| UnsupportedFilterOperationError;

export class PackageManagerService extends Context.Service<
	PackageManagerService,
	{
		readonly lockDir: string;
		readonly name: string;
		readonly filterSpec: FilterSpec;
		readonly detectHasWorkspaces: (
			lockDir: string,
		) => Effect.Effect<
			boolean,
			PlatformError.PlatformError | Schema.SchemaError,
			FileSystem.FileSystem | Path.Path
		>;
		readonly listWorkspacePackages: (
			lockDir: string,
		) => Effect.Effect<
			Array<{ name: string; relDir: string }>,
			PlatformError.PlatformError | Schema.SchemaError,
			FileSystem.FileSystem | Path.Path
		>;
		readonly buildInstallCommand: (
			override?: CommandOverride,
		) => ChildProcess.Command;
		readonly buildFilteredInstallCommand: (
			filters: Array<string>,
			override?: CommandOverride,
		) => Effect.Effect<ChildProcess.Command, FilterCommandError>;
		readonly buildAddCommand: (
			packages: Array<string>,
			dev: boolean,
			filters: Array<string>,
			override?: CommandOverride,
		) => Effect.Effect<ChildProcess.Command, FilterCommandError>;
		readonly buildRemoveCommand: (
			packages: Array<string>,
			filters: Array<string>,
			override?: CommandOverride,
		) => Effect.Effect<ChildProcess.Command, FilterCommandError>;
		readonly resolveInstallFilters: (
			lockDir: string,
			packageName: string,
		) => Effect.Effect<
			Array<string>,
			PlatformError.PlatformError | Schema.SchemaError,
			FileSystem.FileSystem | Path.Path
		>;
	}
>()('PackageManagerService') {}

export const PackageJsonWorkspacesField = Schema.Union([
	Schema.Array(Schema.String),
	Schema.Struct({ packages: Schema.Array(Schema.String) }).pipe(
		Schema.decodeTo(
			Schema.Array(Schema.String),
			SchemaTransformation.transform({
				decode: (obj) => obj.packages,
				encode: (arr) => ({ packages: arr }),
			}),
		),
	),
]);

const WorkspacePackageJson = Schema.Struct({
	name: Schema.String,
});

const readPackageName = (pkgJsonPath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const content = yield* fs.readFileString(pkgJsonPath);
		return yield* Schema.decodeEffect(
			Schema.fromJsonString(WorkspacePackageJson),
		)(content);
	}).pipe(Effect.option);

export const enumerateWorkspacePackages = (
	lockDir: string,
	globs: ReadonlyArray<string>,
) =>
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
								return [
									{
										name: decoded.value.name,
										relDir: path.join(baseDir, entry),
									},
								];
							}),
						);
						const results = yield* Effect.all(entryTasks, {
							concurrency: 'unbounded',
						});
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

const PackageJsonWithDeps = Schema.Struct({
	dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	devDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

export const collectWorkspaceDependencies = (
	lockDir: string,
	packageName: string,
	allPackages: Array<{ name: string; relDir: string }>,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;

		const packagesByName = new Map(allPackages.map((p) => [p.name, p.relDir]));
		const collected = new Set<string>();

		const resolve = (
			name: string,
		): Effect.Effect<
			void,
			PlatformError.PlatformError | Schema.SchemaError,
			FileSystem.FileSystem | Path.Path
		> =>
			Effect.gen(function* () {
				if (collected.has(name)) return;
				const relDir = packagesByName.get(name);
				if (relDir === undefined) return;
				collected.add(name);

				const pkgJsonPath = path.join(lockDir, relDir, 'package.json');
				const content = yield* fs.readFileString(pkgJsonPath);
				const pkg = yield* Schema.decodeEffect(
					Schema.fromJsonString(PackageJsonWithDeps),
				)(content);

				const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
				for (const [depName, version] of Object.entries(allDeps)) {
					if (version.startsWith('workspace:')) {
						yield* resolve(depName);
					}
				}
			});

		yield* resolve(packageName);
		return Array.from(collected);
	});
