import * as os from 'node:os';
import * as nodePath from 'node:path';
import { FileSystem } from '@effect/platform';
import { Effect, Schema } from 'effect';

const PmOverrides = Schema.Record({
	key: Schema.String,
	value: Schema.Record({ key: Schema.String, value: Schema.String }),
});

const PmConfig = Schema.Struct({
	scopedInstall: Schema.optional(Schema.Boolean),
	overrides: Schema.optional(PmOverrides),
});

export type PmConfig = Schema.Schema.Type<typeof PmConfig>;
export type CommandOverride = {
	bin: string;
	subcommand: ReadonlyArray<string>;
};

const defaultConfig: PmConfig = {
	scopedInstall: false,
};

/** Path to the user-level config file, honoring XDG_CONFIG_HOME. */
const globalConfigPath = () => {
	const base =
		process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.length > 0
			? process.env.XDG_CONFIG_HOME
			: nodePath.join(os.homedir(), '.config');
	return nodePath.join(base, 'better-pm', 'config.json');
};

const readConfigFile = (configPath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		const exists = yield* fs.exists(configPath);
		if (!exists) return {} as PmConfig;

		const content = yield* fs.readFileString(configPath);
		return yield* Schema.decode(Schema.parseJson(PmConfig))(content);
	});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** One-level-deep merge; override wins, except when both values are plain records, which shallow-merge. */
const mergeConfig = (base: PmConfig, override: PmConfig): PmConfig => {
	const baseRecord = base as Record<string, unknown>;
	const overrideRecord = override as Record<string, unknown>;
	const keys = new Set([
		...Object.keys(baseRecord),
		...Object.keys(overrideRecord),
	]);
	return Object.fromEntries(
		Array.from(keys, (key) => {
			const baseValue = baseRecord[key];
			const overrideValue = overrideRecord[key];
			if (overrideValue === undefined) return [key, baseValue];
			if (baseValue === undefined) return [key, overrideValue];
			if (isRecord(baseValue) && isRecord(overrideValue)) {
				return [key, { ...baseValue, ...overrideValue }];
			}
			return [key, overrideValue];
		}),
	) as PmConfig;
};

export const loadConfig = (lockDir: string) =>
	Effect.gen(function* () {
		const global = yield* readConfigFile(globalConfigPath());
		const project = yield* readConfigFile(
			nodePath.join(lockDir, 'pm.config.json'),
		);
		return mergeConfig(mergeConfig(defaultConfig, global), project);
	});

export const resolveCommandOverride = (
	config: PmConfig,
	pmName: string,
	operation: string,
): CommandOverride | undefined => {
	const value = config.overrides?.[pmName]?.[operation];
	if (value === undefined) return undefined;

	const tokens = value.split(/\s+/).filter((token) => token.length > 0);
	if (tokens.length === 0) return undefined;

	const bin = tokens[0];
	const subcommand = tokens.slice(1);
	return { bin, subcommand };
};
