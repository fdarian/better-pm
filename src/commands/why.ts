import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';
import { filterOption } from '#src/commands/filter-option.ts';
import { runFilteredCommand } from '#src/commands/run-filtered-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

export const whyCmd = cli.Command.make(
	'why',
	{ args: argsArg, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			if (pm.name === 'npm') {
				yield* Console.error('why is not supported for npm');
				return;
			}
			const passthrough = Array.from(args.args);
			const filters = Array.from(args.filter);
			yield* runFilteredCommand(pm, 'why', ['why'], filters, passthrough);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
