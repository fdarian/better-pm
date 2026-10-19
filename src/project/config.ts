import * as os from 'node:os';
import * as nodePath from 'node:path';
import { Effect, FileSystem, Schema } from 'effect';

const PmOverrides = Schema.Record(
	Schema.String,
	Schema.Record(Schema.String, Schema.String),
);

export type PmConfig = {
	readonly scopedInstall?: boolean | undefined;
	readonly overrides?:
		| Readonly<Record<string, Readonly<Record<string, string>>>>
		| undefined;
};

const PmConfig: Schema.Codec<PmConfig> = Schema.Struct({
	scopedInstall: Schema.optional(Schema.Boolean),
	overrides: Schema.optional(PmOverrides),
});
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
		return yield* Schema.decodeEffect(Schema.fromJsonString(PmConfig))(content);
	});

type PmOverridesConfig = NonNullable<PmConfig['overrides']>;

const mergeOverrides = (
	base: PmOverridesConfig | undefined,
	override: PmOverridesConfig | undefined,
): PmOverridesConfig | undefined => {
	if (override === undefined) return base;
	if (base === undefined) return override;
	return { ...base, ...override };
};

/** One-level-deep merge; override wins, except `overrides`, whose per-package-manager entries shallow-merge. */
const mergeConfig = (base: PmConfig, override: PmConfig): PmConfig => ({
	scopedInstall: override.scopedInstall ?? base.scopedInstall,
	overrides: mergeOverrides(base.overrides, override.overrides),
});

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

	const tokens: Array<string> = [];
	for (const token of value.split(/\s+/)) {
		if (token.length > 0) tokens.push(token);
	}
	if (tokens.length === 0) return undefined;

	const bin = tokens[0];
	const subcommand = tokens.slice(1);
	return { bin, subcommand };
};
