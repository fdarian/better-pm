import { describe, expect, test } from 'vitest';
import { resolveArgv } from './resolve-argv.ts';

const knownCommands = new Set([
	'i',
	'install',
	'add',
	'remove',
	'run',
	'ls',
	'w',
	'up',
	'update',
]);

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

		test('pm -F web alone (no script token) is unchanged', () => {
			const argv = ['bin', 'script', '-F', 'web'];
			expect(resolveArgv(argv, knownCommands)).toEqual(argv);
		});
	});

	// @effect/cli's Command.run only recognizes a subcommand sitting right at
	// argv[2]. A leading -F/--filter (pnpm's own `-F <sel> <subcommand>` order,
	// which the flag is advertised as mirroring) has to be hoisted past the
	// subcommand for every filterable subcommand, not just the bare-script
	// shorthand above.
	describe('leading -F/--filter before a known subcommand', () => {
		test('pm -F web run dev hoists run ahead of the filter', () => {
			expect(
				resolveArgv(
					['bin', 'script', '-F', 'web', 'run', 'dev'],
					knownCommands,
				),
			).toEqual(['bin', 'script', 'run', '-F', 'web', 'dev']);
		});

		test('pm -F @repo/db add agentation hoists add ahead of the filter', () => {
			expect(
				resolveArgv(
					['bin', 'script', '-F', '@repo/db', 'add', 'agentation'],
					knownCommands,
				),
			).toEqual(['bin', 'script', 'add', '-F', '@repo/db', 'agentation']);
		});

		test('pm --filter @repo/db remove agentation handles the long flag', () => {
			expect(
				resolveArgv(
					['bin', 'script', '--filter', '@repo/db', 'remove', 'agentation'],
					knownCommands,
				),
			).toEqual([
				'bin',
				'script',
				'remove',
				'--filter',
				'@repo/db',
				'agentation',
			]);
		});

		test('pm -F @repo/db i hoists the "i" alias with no trailing args', () => {
			expect(
				resolveArgv(['bin', 'script', '-F', '@repo/db', 'i'], knownCommands),
			).toEqual(['bin', 'script', 'i', '-F', '@repo/db']);
		});

		test('pm -F @repo/db w hoists the "w" alias', () => {
			expect(
				resolveArgv(['bin', 'script', '-F', '@repo/db', 'w'], knownCommands),
			).toEqual(['bin', 'script', 'w', '-F', '@repo/db']);
		});

		test('pm -F @repo/db up hoists the "up" alias', () => {
			expect(
				resolveArgv(['bin', 'script', '-F', '@repo/db', 'up'], knownCommands),
			).toEqual(['bin', 'script', 'up', '-F', '@repo/db']);
		});

		test('pm -F @repo/db update hoists the "update" alias', () => {
			expect(
				resolveArgv(
					['bin', 'script', '-F', '@repo/db', 'update'],
					knownCommands,
				),
			).toEqual(['bin', 'script', 'update', '-F', '@repo/db']);
		});

		test('pm -F a -F b add pkg repeats both filters after the hoisted subcommand', () => {
			expect(
				resolveArgv(
					['bin', 'script', '-F', 'a', '-F', 'b', 'add', 'pkg'],
					knownCommands,
				),
			).toEqual(['bin', 'script', 'add', '-F', 'a', '-F', 'b', 'pkg']);
		});

		test('pm -F=web add pkg handles the inline = form', () => {
			expect(
				resolveArgv(['bin', 'script', '-F=web', 'add', 'pkg'], knownCommands),
			).toEqual(['bin', 'script', 'add', '-F=web', 'pkg']);
		});

		test('a leading filter in front of a non-subcommand still gets run inserted', () => {
			expect(
				resolveArgv(
					['bin', 'script', '-F', 'web', 'dev', '--watch'],
					knownCommands,
				),
			).toEqual(['bin', 'script', 'run', '-F', 'web', 'dev', '--watch']);
		});
	});
});
