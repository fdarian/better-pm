import { Effect } from 'effect';
import { Argument, Command } from 'effect/unstable/cli';
import { filterOption } from '#src/commands/filter-option.ts';
import { runFilteredCommand } from '#src/commands/run-filtered-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = Argument.string('args').pipe(Argument.variadic());

export const lsCmd = Command.make(
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
