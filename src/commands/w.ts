import { Console, Effect, Path } from 'effect';
import { Command } from 'effect/unstable/cli';
import { formatWorkspaceTree } from '#src/lib/format-workspace-tree.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const lsCmd = Command.make('ls', {}, () =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const path = yield* Path.Path;
		const packages = yield* pm.listWorkspacePackages(pm.lockDir);
		for (const line of formatWorkspaceTree(packages, path.sep)) {
			yield* Console.log(line);
		}
	}).pipe(Effect.provide(PackageManagerLayer)),
);

export const wCmd = Command.make('w', {}, () =>
	Effect.gen(function* () {
		yield* Console.log('Workspace commands: ls');
	}),
).pipe(Command.withSubcommands([lsCmd]));
