import { Command } from '@effect/cli';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Effect, HashMap } from 'effect';
import { pmCmd } from '#src/commands/index.ts';
import { resolveArgv } from '#src/resolve-argv.ts';
import pkg from '../package.json' with { type: 'json' };

export const cli = Command.run(pmCmd, {
	name: 'pm',
	version: pkg.version,
});

const knownCommands = new Set(HashMap.keys(Command.getSubcommands(pmCmd)));

cli(resolveArgv(process.argv, knownCommands)).pipe(
	Effect.provide(BunContext.layer),
	BunRuntime.runMain,
);
