import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as BunFileSystem from '@effect/platform-bun/BunFileSystem';
import { Effect } from 'effect';
import { afterEach, describe, expect, it } from 'vitest';
import { listPackageScripts } from './package-scripts.ts';

const tempDirectories: Array<string> = [];

const runListPackageScripts = (packageJsonPath: string) =>
	Effect.runPromise(
		listPackageScripts(packageJsonPath).pipe(
			Effect.provide(BunFileSystem.layer),
		),
	);

afterEach(async () => {
	await Promise.all(
		tempDirectories.map((tempDirectory) =>
			fs.rm(tempDirectory, { recursive: true, force: true }),
		),
	);
	tempDirectories.length = 0;
});

describe('listPackageScripts', () => {
	it('lists scripts from package.json', async () => {
		const tempDirectory = await fs.mkdtemp(
			path.join(os.tmpdir(), 'better-pm-scripts-test-'),
		);
		tempDirectories.push(tempDirectory);
		const packageJsonPath = path.join(tempDirectory, 'package.json');
		await fs.writeFile(
			packageJsonPath,
			JSON.stringify({ scripts: { build: 'tsc', test: 'vitest' } }),
		);

		await expect(runListPackageScripts(packageJsonPath)).resolves.toEqual([
			'build',
			'test',
		]);
	});

	it('returns no scripts when package.json has no scripts field', async () => {
		const tempDirectory = await fs.mkdtemp(
			path.join(os.tmpdir(), 'better-pm-scripts-test-'),
		);
		tempDirectories.push(tempDirectory);
		const packageJsonPath = path.join(tempDirectory, 'package.json');
		await fs.writeFile(packageJsonPath, JSON.stringify({ name: 'empty' }));

		await expect(runListPackageScripts(packageJsonPath)).resolves.toEqual([]);
	});
});
