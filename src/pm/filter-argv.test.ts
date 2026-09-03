import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { assembleFilteredArgv, type FilterSpec } from './filter-argv.ts';

const pnpmLikeSpec: FilterSpec = {
	flag: '-F',
	position: 'before-subcommand',
	supportsSelectorSyntax: true,
};

const bunLikeSpec: FilterSpec = {
	flag: '--filter',
	position: 'after-subcommand',
	supportsSelectorSyntax: true,
};

const npmLikeSpec: FilterSpec = {
	flag: '-w',
	position: 'after-subcommand',
	supportsSelectorSyntax: false,
};

describe('assembleFilteredArgv', () => {
	it('places the flag before the subcommand when position is before-subcommand', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(pnpmLikeSpec, ['install'], ['web']),
		);
		expect(argv).toEqual(['-F', 'web', 'install']);
	});

	it('places the flag after the subcommand when position is after-subcommand', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(bunLikeSpec, ['install'], ['web']),
		);
		expect(argv).toEqual(['install', '--filter', 'web']);
	});

	it('repeats the flag once per filter, preserving order', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(pnpmLikeSpec, ['install'], ['web', 'api']),
		);
		expect(argv).toEqual(['-F', 'web', '-F', 'api', 'install']);
	});

	it('appends trailingArgs after the subcommand regardless of flag position', () => {
		const before = Effect.runSync(
			assembleFilteredArgv(pnpmLikeSpec, ['add'], ['web'], ['-D', 'lodash']),
		);
		expect(before).toEqual(['-F', 'web', 'add', '-D', 'lodash']);

		const after = Effect.runSync(
			assembleFilteredArgv(bunLikeSpec, ['add'], ['web'], ['-D', 'lodash']),
		);
		expect(after).toEqual(['add', '--filter', 'web', '-D', 'lodash']);
	});

	it('passes through plain names unchanged when the spec forbids selector syntax', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(npmLikeSpec, ['install'], ['@myapp/web']),
		);
		expect(argv).toEqual(['install', '-w', '@myapp/web']);
	});

	it('returns an empty-filter argv unchanged when there are no filters', () => {
		const argv = Effect.runSync(
			assembleFilteredArgv(pnpmLikeSpec, ['install'], []),
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
				Effect.flip(assembleFilteredArgv(npmLikeSpec, ['install'], [selector])),
			);
			expect(error._tag).toBe('UnsupportedFilterSelectorError');
			expect(error.message).toContain(selector);
		});
	});
});
