import { Console, Effect } from 'effect';
import { Argument, Command } from 'effect/unstable/cli';
import { ChildProcess } from 'effect/unstable/process';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = Argument.string('args').pipe(Argument.variadic());

export const xCmd = Command.make('x', { args: argsArg }, (args) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const passthrough = Array.from(args.args);
		const argv: Array<string> =
			pm.name === 'pnpm'
				? ['pnpx', ...passthrough]
				: pm.name === 'bun'
					? ['bunx', ...passthrough]
					: pm.name === 'nub'
						? ['nub', 'x', ...passthrough]
						: ['npx', ...passthrough];
		const cmd = ChildProcess.make(argv[0], argv.slice(1));
		yield* Console.log(`Running: ${argv.join(' ')}`);
		yield* runShellCommand(cmd);
	}).pipe(Effect.provide(PackageManagerLayer)),
);
