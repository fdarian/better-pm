import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { runShellCommand } from '#src/commands/run-shell-command.ts';

const devOption = cli.Options.boolean('D').pipe(
	cli.Options.withDefault(false),
);

const packagesArg = cli.Args.text({ name: 'packages' }).pipe(
	cli.Args.atLeast(1),
);

export const addCmd = cli.Command.make(
	'add',
	{ dev: devOption, packages: packagesArg },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const packages = Array.from(args.packages);
			const cmd = pm.buildAddCommand(packages, args.dev);
			const flag = args.dev ? ' -D' : '';
			yield* Console.log(`Running: ${pm.name} add${flag} ${packages.join(' ')}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
