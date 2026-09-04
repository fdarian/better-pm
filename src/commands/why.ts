import { Console, Effect } from 'effect';
import { Argument, Command } from 'effect/unstable/cli';
import { filterOption } from '#src/commands/filter-option.ts';
import { runFilteredCommand } from '#src/commands/run-filtered-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = Argument.string('args').pipe(Argument.variadic());

export const whyCmd = Command.make(
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
