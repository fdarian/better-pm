import * as cli from '@effect/cli';
import { Path } from '@effect/platform';
import { Console, Effect } from 'effect';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { formatWorkspaceTree } from '#src/lib/format-workspace-tree.ts';

export const lsCmd = cli.Command.make('ls', {}, () =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const path = yield* Path.Path;
		const packages = yield* pm.listWorkspacePackages(pm.lockDir);
		for (const line of formatWorkspaceTree(packages, path.sep)) {
			yield* Console.log(line);
		}
	}),
);
