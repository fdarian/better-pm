import * as cli from '@effect/cli';
import { Command as ShellCommand } from '@effect/platform';
import { Console, Effect } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { filterOption } from '#src/lib/filter-option.ts';
import { assembleFilteredArgv } from '#src/pm/filter-argv.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

export const linkCmd = cli.Command.make(
	'link',
	{ args: argsArg, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const passthrough = Array.from(args.args);
			const filters = Array.from(args.filter);
			const argv = yield* assembleFilteredArgv(
				pm.filterSpec,
				['link'],
				filters,
				passthrough,
			);
			const cmd = ShellCommand.make(pm.name, ...argv);
			yield* Console.log(`Running: ${pm.name} ${argv.join(' ')}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
