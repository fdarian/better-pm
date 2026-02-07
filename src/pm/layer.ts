import { Layer } from 'effect';
import { detectPackageManager } from '#src/pm/detect.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

export const PackageManagerLayer = Layer.effect(
	PackageManagerService,
	detectPackageManager,
);
