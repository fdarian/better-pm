import * as cli from '@effect/cli';
import { Command as ShellCommand } from '@effect/platform';
import { Console, Effect } from 'effect';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { runShellCommand } from '#src/commands/run-shell-command.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

export const whyCmd = cli.Command.make(
	'why',
	{ args: argsArg },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			if (pm.name === 'npm') {
				yield* Console.error('why is not supported for npm');
				return;
			}
			const passthrough = Array.from(args.args);
			const cmd = ShellCommand.make(pm.name, 'why', ...passthrough);
			yield* Console.log(`Running: ${pm.name} why ${passthrough.join(' ')}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
