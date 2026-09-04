import { Effect } from 'effect';
import { Argument, Command } from 'effect/unstable/cli';
import { filterOption } from '#src/commands/filter-option.ts';
import { runFilteredCommand } from '#src/commands/run-filtered-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = Argument.string('args').pipe(Argument.variadic());

export const execCmd = Command.make(
	'exec',
	{ args: argsArg, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			// `bun x` is bun's binary runner (bunx); prefer it over `bun run`,
			// which resolves package.json scripts first and would shadow a
			// same-named binary
			const subcommand = pm.name === 'bun' ? 'x' : 'exec';
			const passthrough = Array.from(args.args);
			const filters = Array.from(args.filter);
			yield* runFilteredCommand(pm, 'exec', [subcommand], filters, passthrough);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
