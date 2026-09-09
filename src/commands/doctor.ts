import { Console, Effect } from 'effect';
import { Command } from 'effect/unstable/cli';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

export const doctorCmd = Command.make('doctor', {}, () =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		yield* Console.log(`Package manager: ${pm.name}`);
		yield* Console.log(`Project root: ${pm.lockDir}`);
	}).pipe(Effect.provide(PackageManagerLayer)),
);
