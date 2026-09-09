import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as BunFileSystem from '@effect/platform-bun/BunFileSystem';
import * as BunPath from '@effect/platform-bun/BunPath';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findUpward } from './find-upward.ts';

const runFindUpward = (
	filenames: string | ReadonlyArray<string>,
	startDir: string,
) =>
	Effect.runPromise(
		findUpward(filenames, startDir).pipe(
			Effect.provide(BunFileSystem.layer),
			Effect.provide(BunPath.layer),
		),
	);

describe('findUpward', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'better-pm-find-upward-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('finds a checkout-root file from a nested child directory', async () => {
		const checkoutDir = path.join(tmpDir, 'outer', 'worktrees', 'inner');
		const childDir = path.join(checkoutDir, 'packages', 'app');
		await fs.mkdir(childDir, { recursive: true });
		await fs.writeFile(path.join(checkoutDir, '.git'), 'gitdir: /tmp/inner');
		await fs.writeFile(path.join(checkoutDir, 'bun.lock'), '');

		await expect(runFindUpward('bun.lock', childDir)).resolves.toBe(
			path.join(checkoutDir, 'bun.lock'),
		);
	});

	it('does not search outside the nearest checkout boundary', async () => {
		const outerDir = path.join(tmpDir, 'outer');
		const checkoutDir = path.join(outerDir, 'worktrees', 'inner');
		const childDir = path.join(checkoutDir, 'packages', 'app');
		await fs.mkdir(childDir, { recursive: true });
		await fs.writeFile(path.join(outerDir, 'pnpm-lock.yaml'), '');
		await fs.mkdir(path.join(checkoutDir, '.git'));

		await expect(runFindUpward('pnpm-lock.yaml', childDir)).rejects.toThrow(
			'pnpm-lock.yaml not found',
		);
	});
});
