import * as cli from '@effect/cli';
import { Command as ShellCommand } from '@effect/platform';
import { Console, Effect } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { filterOption } from '#src/lib/filter-option.ts';
import { assembleFilteredArgv } from '#src/pm/filter-argv.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

/** `x` runs a locally installed binary via each PM's one-off runner; nub is the only one addressed through its own bin with an explicit `x` subcommand. */
const resolveBinAndSubcommand = (pmName: string): [string, Array<string>] => {
	if (pmName === 'pnpm') return ['pnpx', []];
	if (pmName === 'bun') return ['bunx', []];
	if (pmName === 'nub') return ['nub', ['x']];
	return ['npx', []];
};

export const xCmd = cli.Command.make(
	'x',
	{ args: argsArg, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const [bin, subcommand] = resolveBinAndSubcommand(pm.name);
			const passthrough = Array.from(args.args);
			const filters = Array.from(args.filter);
			const argv = yield* assembleFilteredArgv(
				pm.filterSpec,
				subcommand,
				filters,
				passthrough,
			);
			const cmd = ShellCommand.make(bin, ...argv);
			yield* Console.log(`Running: ${bin} ${argv.join(' ')}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
