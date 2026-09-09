import { Effect, FileSystem, Path, Schema } from 'effect';
import { NoPackageManagerDetectedError } from '#src/lib/errors.ts';
import { bunPackageManager } from '#src/pm/bun.ts';
import { npmPackageManager } from '#src/pm/npm.ts';
import { nubPackageManager } from '#src/pm/nub.ts';
import type { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { pnpmPackageManager } from '#src/pm/pnpm.ts';
import { findUpward } from '#src/project/find-upward.ts';

const LOCK_FILES: Array<{
	file: string;
	implementation: Omit<(typeof PackageManagerService)['Service'], 'lockDir'>;
}> = [
	{ file: 'pnpm-lock.yaml', implementation: pnpmPackageManager },
	{ file: 'bun.lock', implementation: bunPackageManager },
	{ file: 'bun.lockb', implementation: bunPackageManager },
	{ file: 'package-lock.json', implementation: npmPackageManager },
	{ file: 'nub.lock', implementation: nubPackageManager },
];

const LOCK_FILE_NAMES = LOCK_FILES.map((lockFile) => lockFile.file);

const PackageJsonWithPackageManager = Schema.Struct({
	packageManager: Schema.optional(Schema.String),
});

const getPackageManagerImplementation = (packageManager: string) => {
	const versionIndex = packageManager.lastIndexOf('@');
	const packageManagerName =
		versionIndex === -1
			? packageManager
			: packageManager.slice(0, versionIndex);

	switch (packageManagerName) {
		case 'pnpm':
			return pnpmPackageManager;
		case 'bun':
			return bunPackageManager;
		case 'npm':
			return npmPackageManager;
		case 'nub':
			return nubPackageManager;
	}
};

const getPackageManagerFromPackageJson = (packageJsonPath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const content = yield* fs.readFileString(packageJsonPath);
		const pkg = yield* Schema.decodeEffect(
			Schema.fromJsonString(PackageJsonWithPackageManager),
		)(content);
		if (pkg.packageManager === undefined) return;
		return getPackageManagerImplementation(pkg.packageManager);
	});

export const detectPackageManager = (startDir = process.cwd()) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;

		const result = yield* findUpward(LOCK_FILE_NAMES, startDir).pipe(
			Effect.option,
		);
		if (result._tag === 'Some') {
			const lockDir = path.dirname(result.value);
			const rootPackageJsonPath = path.join(lockDir, 'package.json');
			const rootPackageJsonExists = yield* fs.exists(rootPackageJsonPath);
			if (rootPackageJsonExists) {
				const implementation =
					yield* getPackageManagerFromPackageJson(rootPackageJsonPath);
				if (implementation !== undefined) {
					return { ...implementation, lockDir };
				}
			}

			const filename = path.basename(result.value);
			const lockFile = LOCK_FILES.find(
				(candidate) => candidate.file === filename,
			);
			if (lockFile === undefined) {
				return yield* Effect.die(new Error(`Unknown lock file: ${filename}`));
			}
			return { ...lockFile.implementation, lockDir };
		}

		const packageJsonPath = yield* findUpward('package.json', startDir).pipe(
			Effect.option,
		);
		if (packageJsonPath._tag === 'Some') {
			const implementation = yield* getPackageManagerFromPackageJson(
				packageJsonPath.value,
			);
			if (implementation !== undefined) {
				return {
					...implementation,
					lockDir: path.dirname(packageJsonPath.value),
				};
			}
		}
		return yield* Effect.fail(new NoPackageManagerDetectedError());
	});
