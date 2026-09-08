import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as BunFileSystem from '@effect/platform-bun/BunFileSystem';
import * as BunPath from '@effect/platform-bun/BunPath';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectPackageManager } from './detect.ts';

const runDetectPackageManager = (startDir: string) =>
	Effect.runPromise(
		detectPackageManager(startDir).pipe(
			Effect.provide(BunFileSystem.layer),
			Effect.provide(BunPath.layer),
		),
	);

describe('detectPackageManager', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'better-pm-detect-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('uses the root package.json packageManager field before lockfiles', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ packageManager: 'bun@1.3.9' }),
		);
		await fs.writeFile(
			path.join(tmpDir, 'pnpm-lock.yaml'),
			'lockfileVersion: 9',
		);
		const workspaceDir = path.join(tmpDir, 'packages', 'web');
		await fs.mkdir(workspaceDir, { recursive: true });
		await fs.writeFile(
			path.join(workspaceDir, 'package.json'),
			JSON.stringify({ name: '@repo/web' }),
		);

		const packageManager = await runDetectPackageManager(workspaceDir);

		expect(packageManager.name).toBe('bun');
		expect(packageManager.lockDir).toBe(tmpDir);
	});

	it('uses packageManager when no lockfile exists', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ packageManager: 'npm@11.6.1' }),
		);

		const packageManager = await runDetectPackageManager(tmpDir);

		expect(packageManager.name).toBe('npm');
		expect(packageManager.lockDir).toBe(tmpDir);
	});

	it('falls back to lockfile detection for an unsupported packageManager', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ packageManager: 'yarn@4.10.0' }),
		);
		await fs.writeFile(
			path.join(tmpDir, 'pnpm-lock.yaml'),
			'lockfileVersion: 9',
		);

		const packageManager = await runDetectPackageManager(tmpDir);

		expect(packageManager.name).toBe('pnpm');
		expect(packageManager.lockDir).toBe(tmpDir);
	});
});
