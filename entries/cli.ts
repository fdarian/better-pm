import { Command } from '@effect/cli';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Effect } from 'effect';
import { pmCmd } from '#src/commands/index.ts';
import pkg from '../package.json' with { type: 'json' };

export const cli = Command.run(pmCmd, {
	name: 'pm',
	version: pkg.version,
});

cli(process.argv).pipe(
	Effect.provide(BunContext.layer),
	BunRuntime.runMain,
);
