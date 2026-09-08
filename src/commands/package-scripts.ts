import { Effect, FileSystem, Schema } from 'effect';

const PackageJsonWithScripts = Schema.Struct({
	scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

/** Reads the script names declared by one package.json file. */
export const listPackageScripts = (packageJsonPath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const content = yield* fs.readFileString(packageJsonPath);
		const packageJson = yield* Schema.decodeEffect(
			Schema.fromJsonString(PackageJsonWithScripts),
		)(content);

		if (packageJson.scripts === undefined) return [];
		return Object.keys(packageJson.scripts);
	});
