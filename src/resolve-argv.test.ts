import { describe, expect, test } from 'bun:test';
import { resolveArgv } from './resolve-argv.ts';

const knownCommands = new Set(['i', 'install', 'add', 'remove', 'run', 'ls']);

describe('resolveArgv', () => {
	test('unknown command gets prefixed with run', () => {
		expect(resolveArgv(['bin', 'script', 'dev'], knownCommands)).toEqual([
			'bin',
			'script',
			'run',
			'dev',
		]);
	});

	test('unknown command preserves trailing args', () => {
		expect(
			resolveArgv(['bin', 'script', 'dev', '--watch'], knownCommands),
		).toEqual(['bin', 'script', 'run', 'dev', '--watch']);
	});

	test('another unknown command gets prefixed', () => {
		expect(resolveArgv(['bin', 'script', 'test'], knownCommands)).toEqual([
			'bin',
			'script',
			'run',
			'test',
		]);
	});

	test('known command "run" is unchanged', () => {
		const argv = ['bin', 'script', 'run', 'test'];
		expect(resolveArgv(argv, knownCommands)).toEqual(argv);
	});

	test('known command "i" is unchanged', () => {
		const argv = ['bin', 'script', 'i'];
		expect(resolveArgv(argv, knownCommands)).toEqual(argv);
	});

	test('known command "add" with args is unchanged', () => {
		const argv = ['bin', 'script', 'add', 'foo'];
		expect(resolveArgv(argv, knownCommands)).toEqual(argv);
	});

	test('flag --version is unchanged', () => {
		const argv = ['bin', 'script', '--version'];
		expect(resolveArgv(argv, knownCommands)).toEqual(argv);
	});

	test('no args is unchanged', () => {
		const argv = ['bin', 'script'];
		expect(resolveArgv(argv, knownCommands)).toEqual(argv);
	});

	test('flag -h is unchanged', () => {
		const argv = ['bin', 'script', '-h'];
		expect(resolveArgv(argv, knownCommands)).toEqual(argv);
	});
});
