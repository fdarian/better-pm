import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { assembleFilteredArgv, type FilterSpec } from './filter-argv.ts';

const pnpmLikeSpec: FilterSpec = {
	flag: '-F',
	position: 'before-subcommand',
	supportsSelectorSyntax: true,
	unsupportedOperations: new Set(['link']),
};

const bunLikeSpec: FilterSpec = {
	flag: '--filter',
	position: 'after-subcommand',
	supportsSelectorSyntax: true,
	unsupportedOperations: new Set(['exec', 'why', 'link', 'unlink', 'ls']),
};

const npmLikeSpec: FilterSpec = {
	flag: '-w',
	position: 'after-subcommand',
	supportsSelectorSyntax: false,
	unsupportedOperations: new Set(),
};

describe('assembleFilteredArgv', () => {
	it('places the flag before the subcommand when position is before-subcommand', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(
				pnpmLikeSpec,
				'pnpm',
				'install',
				['install'],
				['web'],
			),
		);
		expect(argv).toEqual(['-F', 'web', 'install']);
	});

	it('places the flag after the subcommand when position is after-subcommand', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(bunLikeSpec, 'bun', 'install', ['install'], ['web']),
		);
		expect(argv).toEqual(['install', '--filter', 'web']);
	});

	it('repeats the flag once per filter, preserving order', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(
				pnpmLikeSpec,
				'pnpm',
				'install',
				['install'],
				['web', 'api'],
			),
		);
		expect(argv).toEqual(['-F', 'web', '-F', 'api', 'install']);
	});

	it('appends trailingArgs after the subcommand regardless of flag position', () => {
		const before = Effect.runSync(
			assembleFilteredArgv(
				pnpmLikeSpec,
				'pnpm',
				'add',
				['add'],
				['web'],
				['-D', 'lodash'],
			),
		);
		expect(before).toEqual(['-F', 'web', 'add', '-D', 'lodash']);

		const after = Effect.runSync(
			assembleFilteredArgv(
				bunLikeSpec,
				'bun',
				'add',
				['add'],
				['web'],
				['-D', 'lodash'],
			),
		);
		expect(after).toEqual(['add', '--filter', 'web', '-D', 'lodash']);
	});

	it('passes through plain names unchanged when the spec forbids selector syntax', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(
				npmLikeSpec,
				'npm',
				'install',
				['install'],
				['@myapp/web'],
			),
		);
		expect(argv).toEqual(['install', '-w', '@myapp/web']);
	});

	it('returns an empty-filter argv unchanged when there are no filters', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(pnpmLikeSpec, 'pnpm', 'install', ['install'], []),
		);
		expect(argv).toEqual(['install']);
	});

	describe.each([
		['relational traversal', 'web...'],
		['caret traversal', '^web'],
		['exclusion', '!web'],
		['brace group', '{web}'],
		['bracket selector', '[since]'],
		['glob', 'web*'],
	])('rejects pnpm-only selector syntax: %s', (_label, selector) => {
		it('fails with UnsupportedFilterSelectorError naming the selector', () => {
			const error = Effect.runSync(
				Effect.flip(
					assembleFilteredArgv(
						npmLikeSpec,
						'npm',
						'install',
						['install'],
						[selector],
					),
				),
			);
			expect(error._tag).toBe('UnsupportedFilterSelectorError');
			expect(error.message).toContain(selector);
		});
	});

	describe('operations a PM cannot filter at all', () => {
		it('fails with UnsupportedFilterOperationError naming the PM and operation', () => {
			const error = Effect.runSync(
				Effect.flip(
					assembleFilteredArgv(pnpmLikeSpec, 'pnpm', 'link', ['link'], ['web']),
				),
			);
			expect(error._tag).toBe('UnsupportedFilterOperationError');
			expect(error.message).toContain('pnpm');
			expect(error.message).toContain('link');
		});

		it.each(['exec', 'why', 'link', 'unlink', 'ls'] as const)(
			'bun rejects a filtered %s',
			(operation) => {
				const error = Effect.runSync(
					Effect.flip(
						assembleFilteredArgv(
							bunLikeSpec,
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

		it('does not fail when there are no filters, even for an unsupported operation', () => {
			const argv = Effect.runSync(
				assembleFilteredArgv(bunLikeSpec, 'bun', 'exec', ['x'], [], ['tsc']),
			);
			expect(argv).toEqual(['x', 'tsc']);
		});

		it('lets a supported operation through unaffected', () => {
			const argv = Effect.runSync(
				assembleFilteredArgv(
					bunLikeSpec,
					'bun',
					'run',
					['run'],
					['web'],
					['dev'],
				),
			);
			expect(argv).toEqual(['run', '--filter', 'web', 'dev']);
		});
	});
});
