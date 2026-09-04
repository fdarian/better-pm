import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as BunFileSystem from '@effect/platform-bun/BunFileSystem';
import * as BunPath from '@effect/platform-bun/BunPath';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nubPackageManager } from './nub.ts';

const runListWorkspacePackages = (lockDir: string) =>
	Effect.runPromise(
		nubPackageManager
			.listWorkspacePackages(lockDir)
			.pipe(Effect.provide(BunFileSystem.layer), Effect.provide(BunPath.layer)),
	);

describe('nubPackageManager.listWorkspacePackages', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'better-pm-nub-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('finds packages when workspaces is a plain array', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ workspaces: ['packages/*'] }),
		);
		await fs.mkdir(path.join(tmpDir, 'packages', 'foo'), { recursive: true });
		await fs.writeFile(
			path.join(tmpDir, 'packages', 'foo', 'package.json'),
			JSON.stringify({ name: '@repo/foo' }),
		);

		const packages = await runListWorkspacePackages(tmpDir);
		expect(packages).toEqual([{ name: '@repo/foo', relDir: 'packages/foo' }]);
	});

	it('finds packages when workspaces is an object with a packages field', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'package.json'),
			JSON.stringify({ workspaces: { packages: ['packages/*'] } }),
		);
		await fs.mkdir(path.join(tmpDir, 'packages', 'foo'), { recursive: true });
		await fs.writeFile(
			path.join(tmpDir, 'packages', 'foo', 'package.json'),
			JSON.stringify({ name: '@repo/foo' }),
		);

		const packages = await runListWorkspacePackages(tmpDir);
		expect(packages).toEqual([{ name: '@repo/foo', relDir: 'packages/foo' }]);
	});
});
