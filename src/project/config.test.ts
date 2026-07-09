import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { BunFileSystem } from '@effect/platform-bun';
import { Effect } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, resolveCommandOverride } from './config.ts';

const runConfig = (lockDir: string) =>
	Effect.runPromise(
		loadConfig(lockDir).pipe(Effect.provide(BunFileSystem.layer)),
	);

describe('loadConfig', () => {
	let tmpDir: string;
	let originalXdgConfigHome: string | undefined;
	let emptyXdgDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'better-pm-config-test-'));
		emptyXdgDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'better-pm-config-xdg-empty-'),
		);
		originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
		process.env.XDG_CONFIG_HOME = emptyXdgDir;
	});

	afterEach(async () => {
		if (originalXdgConfigHome === undefined) {
			delete process.env.XDG_CONFIG_HOME;
		} else {
			process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
		}
		await fs.rm(tmpDir, { recursive: true, force: true });
		await fs.rm(emptyXdgDir, { recursive: true, force: true });
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

	it('accepts overrides in config file', async () => {
		await fs.writeFile(
			path.join(tmpDir, 'pm.config.json'),
			JSON.stringify({ overrides: { pnpm: { install: 'nub install' } } }),
		);
		const config = await runConfig(tmpDir);
		expect(config.overrides?.pnpm?.install).toBe('nub install');
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

describe('loadConfig with global config', () => {
	let tmpDir: string;
	let xdgBase: string;
	let originalXdgConfigHome: string | undefined;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'better-pm-config-test-'));
		xdgBase = await fs.mkdtemp(path.join(os.tmpdir(), 'better-pm-config-xdg-'));
		originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
		process.env.XDG_CONFIG_HOME = xdgBase;
	});

	afterEach(async () => {
		if (originalXdgConfigHome === undefined) {
			delete process.env.XDG_CONFIG_HOME;
		} else {
			process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
		}
		await fs.rm(tmpDir, { recursive: true, force: true });
		await fs.rm(xdgBase, { recursive: true, force: true });
	});

	const writeGlobalConfig = async (config: Record<string, unknown>) => {
		const globalConfigDir = path.join(xdgBase, 'better-pm');
		await fs.mkdir(globalConfigDir, { recursive: true });
		await fs.writeFile(
			path.join(globalConfigDir, 'config.json'),
			JSON.stringify(config),
		);
	};

	it('picks up global-only config when no project pm.config.json exists', async () => {
		await writeGlobalConfig({ scopedInstall: true });
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(true);
	});

	it('project overrides global on a conflicting key (project true wins over global false)', async () => {
		await writeGlobalConfig({ scopedInstall: false });
		await fs.writeFile(
			path.join(tmpDir, 'pm.config.json'),
			JSON.stringify({ scopedInstall: true }),
		);
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(true);
	});

	it('project overrides global on a conflicting key (project false wins over global true)', async () => {
		await writeGlobalConfig({ scopedInstall: true });
		await fs.writeFile(
			path.join(tmpDir, 'pm.config.json'),
			JSON.stringify({ scopedInstall: false }),
		);
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(false);
	});

	it('honors XDG_CONFIG_HOME when reading the global config', async () => {
		await writeGlobalConfig({ scopedInstall: true });
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(true);
	});

	it('falls back to defaults when both global and project config are missing', async () => {
		const config = await runConfig(tmpDir);
		expect(config.scopedInstall).toBe(false);
	});
});

describe('resolveCommandOverride', () => {
	it('parses override string into bin and subcommand', () => {
		const override = resolveCommandOverride(
			{ overrides: { pnpm: { install: 'nub install' } } },
			'pnpm',
			'install',
		);
		expect(override).toEqual({ bin: 'nub', subcommand: ['install'] });
	});

	it('returns undefined when package manager or operation is missing', () => {
		expect(resolveCommandOverride({}, 'pnpm', 'install')).toBeUndefined();
		expect(
			resolveCommandOverride(
				{ overrides: { bun: { install: 'bun install' } } },
				'pnpm',
				'install',
			),
		).toBeUndefined();
		expect(
			resolveCommandOverride(
				{ overrides: { pnpm: { add: 'nub add' } } },
				'pnpm',
				'install',
			),
		).toBeUndefined();
	});

	it('returns undefined for blank override string', () => {
		expect(
			resolveCommandOverride(
				{ overrides: { pnpm: { install: '   ' } } },
				'pnpm',
				'install',
			),
		).toBeUndefined();
	});
});
