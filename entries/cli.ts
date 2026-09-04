import { BunRuntime, BunServices } from '@effect/platform-bun';
import { Effect } from 'effect';
import { Command } from 'effect/unstable/cli';
import { pmCmd } from '#src/commands/index.ts';
import { resolveArgv } from '#src/resolve-argv.ts';
import pkg from '../package.json' with { type: 'json' };

export const cli = Command.runWith(pmCmd, {
	version: pkg.version,
});

// `pmCmd.subcommands` groups commands (v4 dropped the v3 name→Command map);
// every command here is ungrouped, so they all land in one group.
const knownCommands = new Set(
	pmCmd.subcommands.flatMap((group) => group.commands.map((cmd) => cmd.name)),
);

// `Command.runWith` (unlike v3's `Command.run`) expects argv without the
// leading node/script entries — it reads the same shape `Stdio`'s layer
// would produce from `process.argv.slice(2)`.
cli(resolveArgv(process.argv, knownCommands).slice(2)).pipe(
	Effect.provide(BunServices.layer),
	BunRuntime.runMain,
);
