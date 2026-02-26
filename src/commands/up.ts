import * as cli from '@effect/cli';
import { Command as ShellCommand } from '@effect/platform';
import { Console, Effect } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const interactiveOption = cli.Options.boolean('i').pipe(
	cli.Options.withDefault(false),
);

const latestOption = cli.Options.boolean('latest').pipe(
	cli.Options.withDefault(false),
);

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

const updateHandler = (args: {
	i: boolean;
	latest: boolean;
	args: ReadonlyArray<string>;
}) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const extraArgs: Array<string> = [];
		if (args.i) extraArgs.push('-i');
		if (args.latest) extraArgs.push('--latest');
		extraArgs.push(...Array.from(args.args));
		const cmd = ShellCommand.make(pm.name, 'update', ...extraArgs);
		yield* Console.log(`Running: ${pm.name} update ${extraArgs.join(' ')}`);
		yield* runShellCommand(cmd);
	}).pipe(Effect.provide(PackageManagerLayer));

export const upCmd = cli.Command.make(
	'up',
	{ i: interactiveOption, latest: latestOption, args: argsArg },
	updateHandler,
);

export const updateCmd = cli.Command.make(
	'update',
	{ i: interactiveOption, latest: latestOption, args: argsArg },
	updateHandler,
);
