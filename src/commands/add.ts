import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';
import { filterOption } from '#src/commands/filter-option.ts';
import { renderCommand } from '#src/commands/render-command.ts';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { resolveAddArgs } from '#src/lib/parse-pm-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { loadConfig, resolveCommandOverride } from '#src/project/config.ts';

const devOption = cli.Options.boolean('D').pipe(cli.Options.withDefault(false));

const packagesArg = cli.Args.text({ name: 'packages' }).pipe(
	cli.Args.atLeast(1),
);

export const addCmd = cli.Command.make(
	'add',
	{ dev: devOption, packages: packagesArg, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const config = yield* loadConfig(pm.lockDir);
			const override = resolveCommandOverride(config, pm.name, 'add');
			const resolved = resolveAddArgs(Array.from(args.packages), args.dev);
			const filters = Array.from(args.filter);
			const cmd = yield* pm.buildAddCommand(
				resolved.packages,
				resolved.dev,
				filters,
				override,
			);
			yield* Console.log(`Running: ${renderCommand(cmd)}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
