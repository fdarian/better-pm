import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { runShellCommand } from '#src/commands/run-shell-command.ts';

const packagesArg = cli.Args.text({ name: 'packages' }).pipe(
	cli.Args.atLeast(1),
);

export const removeCmd = cli.Command.make(
	'remove',
	{ packages: packagesArg },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const packages = Array.from(args.packages);
			const cmd = pm.buildRemoveCommand(packages);
			yield* Console.log(`Running: ${pm.name} remove ${packages.join(' ')}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
