import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { bunPackageManager } from './bun.ts';
import { npmPackageManager } from './npm.ts';
import { nubPackageManager } from './nub.ts';
import { pnpmPackageManager } from './pnpm.ts';

const serializeCommand = (command: unknown) => {
	const json = JSON.parse(JSON.stringify(command)) as {
		command?: string;
		args?: Array<string>;
	};
	return { command: json.command, args: json.args };
};

const run = (effect: Effect.Effect<unknown, unknown>) =>
	serializeCommand(Effect.runSync(effect as Effect.Effect<unknown, never>));

describe('package manager builders', () => {
	it('uses override prefix for add command', () => {
		const command = pnpmPackageManager.buildAddCommand(['lodash'], false, [], {
			bin: 'nub',
			subcommand: ['add'],
		});
		const serialized = run(command);
		expect(serialized.command).toBe('nub');
		expect(serialized.args).toEqual(['add', 'lodash']);
	});

	describe('pnpm', () => {
		it('places -F before the subcommand for a filtered install', () => {
			const serialized = run(
				pnpmPackageManager.buildFilteredInstallCommand(['web']),
			);
			expect(serialized).toEqual({
				command: 'pnpm',
				args: ['-F', 'web', 'install'],
			});
		});

		it('repeats -F for each filter', () => {
			const serialized = run(
				pnpmPackageManager.buildFilteredInstallCommand(['web', 'api']),
			);
			expect(serialized.args).toEqual(['-F', 'web', '-F', 'api', 'install']);
		});

		it('places -F before add, with -D and packages trailing', () => {
			const serialized = run(
				pnpmPackageManager.buildAddCommand(['lodash'], true, ['web']),
			);
			expect(serialized.args).toEqual(['-F', 'web', 'add', '-D', 'lodash']);
		});

		it('places -F before remove, with packages trailing', () => {
			const serialized = run(
				pnpmPackageManager.buildRemoveCommand(['lodash'], ['web']),
			);
			expect(serialized.args).toEqual(['-F', 'web', 'remove', 'lodash']);
		});

		it('honors a CommandOverride together with filters', () => {
			const serialized = run(
				pnpmPackageManager.buildFilteredInstallCommand(['web'], {
					bin: 'nub',
					subcommand: ['install'],
				}),
			);
			expect(serialized).toEqual({
				command: 'nub',
				args: ['-F', 'web', 'install'],
			});
		});
	});

	describe('bun', () => {
		it('places --filter after the subcommand for a filtered install', () => {
			const serialized = run(
				bunPackageManager.buildFilteredInstallCommand(['web']),
			);
			expect(serialized).toEqual({
				command: 'bun',
				args: ['install', '--filter', 'web'],
			});
		});

		it('repeats --filter for each filter', () => {
			const serialized = run(
				bunPackageManager.buildFilteredInstallCommand(['web', 'api']),
			);
			expect(serialized.args).toEqual([
				'install',
				'--filter',
				'web',
				'--filter',
				'api',
			]);
		});

		it('places --filter after add, before -D and packages', () => {
			const serialized = run(
				bunPackageManager.buildAddCommand(['lodash'], true, ['web']),
			);
			expect(serialized.args).toEqual([
				'add',
				'--filter',
				'web',
				'-D',
				'lodash',
			]);
		});

		it('places --filter after remove, before packages', () => {
			const serialized = run(
				bunPackageManager.buildRemoveCommand(['lodash'], ['web']),
			);
			expect(serialized.args).toEqual(['remove', '--filter', 'web', 'lodash']);
		});
	});

	describe('npm', () => {
		it('places -w after the subcommand for a filtered install', () => {
			const serialized = run(
				npmPackageManager.buildFilteredInstallCommand(['@myapp/web']),
			);
			expect(serialized).toEqual({
				command: 'npm',
				args: ['install', '-w', '@myapp/web'],
			});
		});

		it('builds add through the install subcommand, with -w before -D/packages', () => {
			const serialized = run(
				npmPackageManager.buildAddCommand(['lodash'], true, ['@myapp/web']),
			);
			expect(serialized.args).toEqual([
				'install',
				'-w',
				'@myapp/web',
				'-D',
				'lodash',
			]);
		});

		it('builds remove through the uninstall subcommand', () => {
			const serialized = run(
				npmPackageManager.buildRemoveCommand(['lodash'], ['@myapp/web']),
			);
			expect(serialized.args).toEqual([
				'uninstall',
				'-w',
				'@myapp/web',
				'lodash',
			]);
		});

		it('passes through plain workspace names unchanged', () => {
			const serialized = run(
				npmPackageManager.buildFilteredInstallCommand(['@myapp/web', 'api']),
			);
			expect(serialized.args).toEqual([
				'install',
				'-w',
				'@myapp/web',
				'-w',
				'api',
			]);
		});

		it.each([
			['relational traversal', 'web...'],
			['exclusion', '!web'],
			['glob', 'web*'],
		])(
			'rejects a pnpm-only selector on filtered install: %s',
			(_label, selector) => {
				const error = Effect.runSync(
					Effect.flip(
						npmPackageManager.buildFilteredInstallCommand([selector]),
					),
				);
				expect(error._tag).toBe('UnsupportedFilterSelectorError');
				expect(error.message).toContain(selector);
			},
		);

		it('rejects a pnpm-only selector on add', () => {
			const error = Effect.runSync(
				Effect.flip(
					npmPackageManager.buildAddCommand(['lodash'], false, ['web...']),
				),
			);
			expect(error._tag).toBe('UnsupportedFilterSelectorError');
			expect(error.message).toContain('web...');
		});

		it('rejects a pnpm-only selector on remove', () => {
			const error = Effect.runSync(
				Effect.flip(npmPackageManager.buildRemoveCommand(['lodash'], ['^web'])),
			);
			expect(error._tag).toBe('UnsupportedFilterSelectorError');
			expect(error.message).toContain('^web');
		});
	});

	describe('nub', () => {
		it('places -F before the subcommand for a filtered install', () => {
			const serialized = run(
				nubPackageManager.buildFilteredInstallCommand(['web']),
			);
			expect(serialized).toEqual({
				command: 'nub',
				args: ['-F', 'web', 'install'],
			});
		});

		it('places -F before add, with -D and packages trailing', () => {
			const serialized = run(
				nubPackageManager.buildAddCommand(['lodash'], true, ['web']),
			);
			expect(serialized.args).toEqual(['-F', 'web', 'add', '-D', 'lodash']);
		});

		it('places -F before remove, with packages trailing', () => {
			const serialized = run(
				nubPackageManager.buildRemoveCommand(['lodash'], ['web']),
			);
			expect(serialized.args).toEqual(['-F', 'web', 'remove', 'lodash']);
		});
	});
});
