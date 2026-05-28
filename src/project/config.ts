import * as nodePath from 'node:path';
import { FileSystem } from '@effect/platform';
import { Effect, Schema } from 'effect';

const PmConfig = Schema.Struct({
	scopedInstall: Schema.optional(Schema.Boolean),
});

export type PmConfig = Schema.Schema.Type<typeof PmConfig>;

const defaultConfig: PmConfig = {
	scopedInstall: false,
};

export const loadConfig = (lockDir: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const configPath = nodePath.join(lockDir, 'pm.config.json');
		const exists = yield* fs.exists(configPath);
		if (!exists) return defaultConfig;

		const content = yield* fs.readFileString(configPath);
		const parsed = yield* Schema.decode(Schema.parseJson(PmConfig))(content);
		return { ...defaultConfig, ...parsed } as PmConfig;
	});
