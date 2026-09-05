import { Console, Effect } from 'effect';
import { Argument, Command } from 'effect/unstable/cli';
import { ChildProcess } from 'effect/unstable/process';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = Argument.string('args').pipe(Argument.variadic());

export const linkCmd = Command.make('link', { args: argsArg }, (args) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const passthrough = Array.from(args.args);
		const cmd = ChildProcess.make(pm.name, ['link', ...passthrough]);
		yield* Console.log(`Running: ${pm.name} link ${passthrough.join(' ')}`);
		yield* runShellCommand(cmd);
	}).pipe(Effect.provide(PackageManagerLayer)),
);
