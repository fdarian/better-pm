import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { resolveAddArgs } from '#src/lib/parse-pm-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const devOption = cli.Options.boolean('D').pipe(cli.Options.withDefault(false));

const packagesArg = cli.Args.text({ name: 'packages' }).pipe(
	cli.Args.atLeast(1),
);

export const addCmd = cli.Command.make(
	'add',
	{ dev: devOption, packages: packagesArg },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const resolved = resolveAddArgs(Array.from(args.packages), args.dev);
			const cmd = pm.buildAddCommand(resolved.packages, resolved.dev);
			const flag = resolved.dev ? ' -D' : '';
			yield* Console.log(
				`Running: ${pm.name} add${flag} ${resolved.packages.join(' ')}`,
			);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
