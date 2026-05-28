import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { BunFileSystem } from '@effect/platform-bun';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

const runConfig = (lockDir: string) =>
	Effect.runPromise(
		loadConfig(lockDir).pipe(Effect.provide(BunFileSystem.layer)),
	);

describe('loadConfig', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'better-pm-config-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('returns default config when pm.config.json does not exist', async () => {
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(false);
	});

	it('returns scopedInstall: false when not set in config file', async () => {
		await fs.writeFile(path.join(tmpDir, 'pm.config.json'), JSON.stringify({}));
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(false);
	});

	it('returns scopedInstall: true when set in config file', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'pm.config.json'),
			JSON.stringify({ scopedInstall: true }),
		);
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(true);
	});

	it('returns scopedInstall: false when explicitly set to false in config file', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'pm.config.json'),
			JSON.stringify({ scopedInstall: false }),
		);
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(false);
	});
});
