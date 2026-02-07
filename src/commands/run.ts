import * as cli from '@effect/cli';
import { Command as ShellCommand } from '@effect/platform';
import { Console, Effect } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

export const runCmd = cli.Command.make('run', { args: argsArg }, (args) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const passthrough = Array.from(args.args);
		const cmd = ShellCommand.make(pm.name, 'run', ...passthrough);
		yield* Console.log(`Running: ${pm.name} run ${passthrough.join(' ')}`);
		yield* runShellCommand(cmd);
	}).pipe(Effect.provide(PackageManagerLayer)),
);
