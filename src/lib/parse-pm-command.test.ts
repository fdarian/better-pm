import { describe, expect, it } from 'vitest';
import { resolveAddArgs } from './parse-pm-command.ts';

describe('passthrough', () => {
	it('returns input unchanged for a single non-PM arg', () => {
		expect(resolveAddArgs(['something'], false)).toEqual({
			packages: ['something'],
			dev: false,
		});
	});

	it('returns input unchanged for multiple non-PM args', () => {
		expect(resolveAddArgs(['foo', 'bar'], false)).toEqual({
			packages: ['foo', 'bar'],
			dev: false,
		});
	});

	it('preserves dev flag for scoped package', () => {
		expect(resolveAddArgs(['@scope/pkg'], true)).toEqual({
			packages: ['@scope/pkg'],
			dev: true,
		});
	});
});

describe('npm', () => {
	it('detects npm install -D', () => {
		expect(resolveAddArgs(['npm install -D something'], false)).toEqual({
			packages: ['something'],
			dev: true,
		});
	});

	it('detects npm install --save-dev', () => {
		expect(resolveAddArgs(['npm install --save-dev something'], false)).toEqual(
			{ packages: ['something'], dev: true },
		);
	});

	it('detects npm i -D', () => {
		expect(resolveAddArgs(['npm i -D something'], false)).toEqual({
			packages: ['something'],
			dev: true,
		});
	});

	it('detects npm install with multiple packages', () => {
		expect(resolveAddArgs(['npm install foo bar'], false)).toEqual({
			packages: ['foo', 'bar'],
			dev: false,
		});
	});
});

describe('pnpm', () => {
	it('detects pnpm add -D with multiple packages', () => {
		expect(resolveAddArgs(['pnpm add -D foo bar'], false)).toEqual({
			packages: ['foo', 'bar'],
			dev: true,
		});
	});

	it('detects pnpm add without dev flag', () => {
		expect(resolveAddArgs(['pnpm add something'], false)).toEqual({
			packages: ['something'],
			dev: false,
		});
	});

	it('detects pnpm install -D', () => {
		expect(resolveAddArgs(['pnpm install -D something'], false)).toEqual({
			packages: ['something'],
			dev: true,
		});
	});
});

describe('bun', () => {
	it('detects bun add without dev flag', () => {
		expect(resolveAddArgs(['bun add something'], false)).toEqual({
			packages: ['something'],
			dev: false,
		});
	});

	it('detects bun add -D', () => {
		expect(resolveAddArgs(['bun add -D something'], false)).toEqual({
			packages: ['something'],
			dev: true,
		});
	});
});

describe('multi-arg (unquoted paste)', () => {
	it('handles shell-split npm install -D', () => {
		expect(
			resolveAddArgs(['npm', 'install', '-D', 'something'], false),
		).toEqual({ packages: ['something'], dev: true });
	});

	it('handles shell-split pnpm add with multiple packages', () => {
		expect(resolveAddArgs(['pnpm', 'add', 'foo', 'bar'], false)).toEqual({
			packages: ['foo', 'bar'],
			dev: false,
		});
	});
});

describe('dev flag merging', () => {
	it('preserves CLI dev flag when command has no dev flag', () => {
		expect(resolveAddArgs(['npm install something'], true)).toEqual({
			packages: ['something'],
			dev: true,
		});
	});

	it('extracts dev flag from command when CLI flag is false', () => {
		expect(resolveAddArgs(['npm install -D something'], false)).toEqual({
			packages: ['something'],
			dev: true,
		});
	});
});

describe('errors', () => {
	it('throws when npm install has no packages', () => {
		expect(() => resolveAddArgs(['npm install'], false)).toThrow(
			'No packages specified',
		);
	});

	it('throws when npm install -D has no packages', () => {
		expect(() => resolveAddArgs(['npm install -D'], false)).toThrow(
			'No packages specified',
		);
	});
});
