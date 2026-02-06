import { Path } from '@effect/platform';
import { Effect } from 'effect';
import { NoPackageManagerDetectedError } from '#src/lib/errors.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { bunPackageManager } from '#src/pm/bun.ts';
import { npmPackageManager } from '#src/pm/npm.ts';
import { pnpmPackageManager } from '#src/pm/pnpm.ts';
import { findUpward } from '#src/project/find-upward.ts';

const LOCK_FILES: Array<{ file: string; implementation: Omit<(typeof PackageManagerService)['Service'], 'lockDir'> }> = [
	{ file: 'pnpm-lock.yaml', implementation: pnpmPackageManager },
	{ file: 'bun.lock', implementation: bunPackageManager },
	{ file: 'bun.lockb', implementation: bunPackageManager },
	{ file: 'package-lock.json', implementation: npmPackageManager },
];

export const detectPackageManager = Effect.gen(function* () {
	const path = yield* Path.Path;

	for (const lockFile of LOCK_FILES) {
		const result = yield* findUpward(lockFile.file).pipe(Effect.option);
		if (result._tag === 'Some') {
			const lockDir = path.dirname(result.value);
			return { ...lockFile.implementation, lockDir };
		}
	}
	return yield* Effect.fail(new NoPackageManagerDetectedError());
});
