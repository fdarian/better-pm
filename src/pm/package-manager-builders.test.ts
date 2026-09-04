import { Effect } from 'effect';
import { ChildProcess } from 'effect/unstable/process';
import { describe, expect, it } from 'vitest';
import { bunPackageManager } from './bun.ts';
import { assembleFilteredArgv } from './filter-argv.ts';
import { npmPackageManager } from './npm.ts';
import { nubPackageManager } from './nub.ts';
import { pnpmPackageManager } from './pnpm.ts';

/**
 * `ChildProcess.Command` is itself an `Effect`, and its prototype's `toJSON`
 * (from `Effectable`) reports the generic `{ _id: "Effect", op }` shape
 * instead of the command's own fields — so `JSON.stringify` can't be used to
 * inspect it. Read the `StandardCommand` fields directly instead.
 */
const serializeCommand = (command: unknown) => {
	if (
		!ChildProcess.isCommand(command) ||
		!ChildProcess.isStandardCommand(command)
	) {
		throw new Error('Expected a StandardCommand');
	}
	return { command: command.command, args: [...command.args] };
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

	// Passthrough commands (run/exec/why/unlink/ls/up) don't call the
	// buildXCommand methods above — they assemble argv directly from each PM's
	// exported `filterSpec`. Exercise that spec the same way those commands do.
	describe('filterSpec (passthrough commands)', () => {
		it('pnpm places -F before an arbitrary supported operation', () => {
			const argv = Effect.runSync(
				assembleFilteredArgv(
					pnpmPackageManager.filterSpec,
					'pnpm',
					'why',
					['why'],
					['web'],
					['lodash'],
				),
			);
			expect(argv).toEqual(['-F', 'web', 'why', 'lodash']);
		});

		it('bun places --filter after a supported operation (run)', () => {
			const argv = Effect.runSync(
				assembleFilteredArgv(
					bunPackageManager.filterSpec,
					'bun',
					'run',
					['run'],
					['web'],
					['dev'],
				),
			);
			expect(argv).toEqual(['run', '--filter', 'web', 'dev']);
		});

		it('npm places -w after an arbitrary supported operation', () => {
			const argv = Effect.runSync(
				assembleFilteredArgv(
					npmPackageManager.filterSpec,
					'npm',
					'link',
					['link'],
					['@myapp/web'],
					[],
				),
			);
			expect(argv).toEqual(['link', '-w', '@myapp/web']);
		});

		it('nub places -F before a supported operation (exec)', () => {
			const argv = Effect.runSync(
				assembleFilteredArgv(
					nubPackageManager.filterSpec,
					'nub',
					'exec',
					['exec'],
					['web'],
					['tsc'],
				),
			);
			expect(argv).toEqual(['-F', 'web', 'exec', 'tsc']);
		});

		it('pnpm/nub reject a filtered link', () => {
			for (const pm of [pnpmPackageManager, nubPackageManager]) {
				const error = Effect.runSync(
					Effect.flip(
						assembleFilteredArgv(
							pm.filterSpec,
							pm.name,
							'link',
							['link'],
							['web'],
						),
					),
				);
				expect(error._tag).toBe('UnsupportedFilterOperationError');
				expect(error.message).toContain(pm.name);
				expect(error.message).toContain('link');
			}
		});

		it.each(['exec', 'why', 'link', 'unlink', 'ls'] as const)(
			'bun rejects a filtered %s',
			(operation) => {
				const error = Effect.runSync(
					Effect.flip(
						assembleFilteredArgv(
							bunPackageManager.filterSpec,
							'bun',
							operation,
							[operation],
							['web'],
						),
					),
				);
				expect(error._tag).toBe('UnsupportedFilterOperationError');
				expect(error.message).toContain('bun');
				expect(error.message).toContain(operation);
			},
		);

		it('npm has no unsupported operations', () => {
			expect(npmPackageManager.filterSpec.unsupportedOperations.size).toBe(0);
		});
	});
});
