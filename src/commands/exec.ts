import * as cli from '@effect/cli';
import { Command as ShellCommand } from '@effect/platform';
import { Console, Effect } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { filterOption } from '#src/lib/filter-option.ts';
import { assembleFilteredArgv } from '#src/pm/filter-argv.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

export const execCmd = cli.Command.make(
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
			const argv = yield* assembleFilteredArgv(
				pm.filterSpec,
				pm.name,
				'exec',
				[subcommand],
				filters,
				passthrough,
			);
			const cmd = ShellCommand.make(pm.name, ...argv);
			yield* Console.log(`Running: ${pm.name} ${argv.join(' ')}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
