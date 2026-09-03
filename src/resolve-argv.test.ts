import { describe, expect, test } from 'vitest';
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

	describe('-F/--filter shorthand', () => {
		test('pm -F web dev inserts run before the filter flag', () => {
			expect(
				resolveArgv(['bin', 'script', '-F', 'web', 'dev'], knownCommands),
			).toEqual(['bin', 'script', 'run', '-F', 'web', 'dev']);
		});

		test('pm --filter web dev inserts run before the filter flag', () => {
			expect(
				resolveArgv(['bin', 'script', '--filter', 'web', 'dev'], knownCommands),
			).toEqual(['bin', 'script', 'run', '--filter', 'web', 'dev']);
		});

		test('pm -F web -F api dev skips repeated filter flags', () => {
			expect(
				resolveArgv(
					['bin', 'script', '-F', 'web', '-F', 'api', 'dev'],
					knownCommands,
				),
			).toEqual(['bin', 'script', 'run', '-F', 'web', '-F', 'api', 'dev']);
		});

		test('pm -F=web dev handles the = form', () => {
			expect(
				resolveArgv(['bin', 'script', '-F=web', 'dev'], knownCommands),
			).toEqual(['bin', 'script', 'run', '-F=web', 'dev']);
		});

		test('pm --filter=web dev handles the = form', () => {
			expect(
				resolveArgv(['bin', 'script', '--filter=web', 'dev'], knownCommands),
			).toEqual(['bin', 'script', 'run', '--filter=web', 'dev']);
		});

		test('preserves trailing args after the script token', () => {
			expect(
				resolveArgv(
					['bin', 'script', '-F', 'web', 'dev', '--watch'],
					knownCommands,
				),
			).toEqual(['bin', 'script', 'run', '-F', 'web', 'dev', '--watch']);
		});

		test('pm -F web run is unchanged since run is a known command', () => {
			const argv = ['bin', 'script', '-F', 'web', 'run', 'dev'];
			expect(resolveArgv(argv, knownCommands)).toEqual(argv);
		});

		test('pm -F web alone (no script token) is unchanged', () => {
			const argv = ['bin', 'script', '-F', 'web'];
			expect(resolveArgv(argv, knownCommands)).toEqual(argv);
		});
	});
});
