import * as cli from '@effect/cli';
import { Console, Effect } from 'effect';
import { filterOption } from '#src/commands/filter-option.ts';
import { renderCommand } from '#src/commands/render-command.ts';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { loadConfig, resolveCommandOverride } from '#src/project/config.ts';

const packagesArg = cli.Args.text({ name: 'packages' }).pipe(
	cli.Args.atLeast(1),
);

export const removeCmd = cli.Command.make(
	'remove',
	{ packages: packagesArg, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const config = yield* loadConfig(pm.lockDir);
			const override = resolveCommandOverride(config, pm.name, 'remove');
			const packages = Array.from(args.packages);
			const filters = Array.from(args.filter);
			const cmd = yield* pm.buildRemoveCommand(packages, filters, override);
			yield* Console.log(`Running: ${renderCommand(cmd)}`);
			yield* runShellCommand(cmd);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
