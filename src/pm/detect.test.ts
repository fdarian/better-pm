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

	it('prefers the nearest lockfile over an ancestor lockfile with higher precedence', async () => {
		const outerDir = path.join(tmpDir, 'outer');
		const checkoutDir = path.join(outerDir, 'worktrees', 'inner');
		const childDir = path.join(checkoutDir, 'packages', 'app');
		await fs.mkdir(childDir, { recursive: true });
		await fs.writeFile(path.join(outerDir, 'pnpm-lock.yaml'), '');
		await fs.writeFile(path.join(checkoutDir, '.git'), 'gitdir: /tmp/inner');
		await fs.writeFile(path.join(checkoutDir, 'bun.lock'), '');

		const packageManager = await runDetectPackageManager(childDir);
		expect(packageManager.name).toBe('bun');
		expect(packageManager.lockDir).toBe(checkoutDir);
	});

	it('prefers a nearer lockfile before reaching an ancestor checkout', async () => {
		const outerDir = path.join(tmpDir, 'outer');
		const projectDir = path.join(outerDir, 'examples', 'bun-project');
		const childDir = path.join(projectDir, 'packages', 'app');
		await fs.mkdir(childDir, { recursive: true });
		await fs.writeFile(path.join(outerDir, 'pnpm-lock.yaml'), '');
		await fs.writeFile(path.join(projectDir, 'bun.lock'), '');

		const packageManager = await runDetectPackageManager(childDir);
		expect(packageManager.name).toBe('bun');
		expect(packageManager.lockDir).toBe(projectDir);
	});

	it('keeps lockfile precedence when candidates are in the same directory', async () => {
		const checkoutDir = path.join(tmpDir, 'checkout');
		await fs.mkdir(checkoutDir, { recursive: true });
		await fs.writeFile(path.join(checkoutDir, '.git'), 'gitdir: /tmp/checkout');
		await fs.writeFile(path.join(checkoutDir, 'pnpm-lock.yaml'), '');
		await fs.writeFile(path.join(checkoutDir, 'bun.lock'), '');

		const packageManager = await runDetectPackageManager(checkoutDir);
		expect(packageManager.name).toBe('pnpm');
		expect(packageManager.lockDir).toBe(checkoutDir);
	});

	it('fails when the nearest checkout has no lockfile', async () => {
		const outerDir = path.join(tmpDir, 'outer');
		const checkoutDir = path.join(outerDir, 'worktrees', 'inner');
		const childDir = path.join(checkoutDir, 'packages', 'app');
		await fs.mkdir(childDir, { recursive: true });
		await fs.writeFile(path.join(outerDir, 'pnpm-lock.yaml'), '');
		await fs.writeFile(path.join(checkoutDir, '.git'), 'gitdir: /tmp/inner');

		await expect(runDetectPackageManager(childDir)).rejects.toMatchObject({
			_tag: 'NoPackageManagerDetectedError',
		});
	});
});
