import { Command } from '@effect/cli';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Effect, Layer } from 'effect';
import { pmCmd } from '#src/commands/index.ts';
import { detectPackageManager } from '#src/pm/detect.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import pkg from '../package.json' with { type: 'json' };

const PackageManagerLayer = Layer.effect(PackageManagerService, detectPackageManager);

export const cli = Command.run(pmCmd, {
	name: 'pm',
	version: pkg.version,
});

cli(process.argv).pipe(
	Effect.provide(Layer.provideMerge(PackageManagerLayer, BunContext.layer)),
	BunRuntime.runMain,
);
