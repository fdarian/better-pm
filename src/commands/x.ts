import * as cli from '@effect/cli';
import { Command as ShellCommand } from '@effect/platform';
import { Console, Effect } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const argsArg = cli.Args.text({ name: 'args' }).pipe(cli.Args.repeated);

export const xCmd = cli.Command.make('x', { args: argsArg }, (args) =>
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
		const cmd = ShellCommand.make(argv[0], ...argv.slice(1));
		yield* Console.log(`Running: ${argv.join(' ')}`);
		yield* runShellCommand(cmd);
	}).pipe(Effect.provide(PackageManagerLayer)),
);
