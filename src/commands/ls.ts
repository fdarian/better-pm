import * as cli from '@effect/cli';
import { Effect } from 'effect';
import { filterOption } from '#src/commands/filter-option.ts';
import { runFilteredCommand } from '#src/commands/run-filtered-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

export const lsCmd = cli.Command.make(
	'ls',
	{ args: argsArg, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const subcommand = pm.name === 'bun' ? ['pm', 'ls'] : ['ls'];
			const passthrough = Array.from(args.args);
			const filters = Array.from(args.filter);
			yield* runFilteredCommand(pm, 'ls', subcommand, filters, passthrough);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
