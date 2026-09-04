import { Command as ShellCommand } from '@effect/platform';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { bunPackageManager } from '#src/pm/bun.ts';
import { npmPackageManager } from '#src/pm/npm.ts';
import { pnpmPackageManager } from '#src/pm/pnpm.ts';
import { renderCommand } from './render-command.ts';

describe('renderCommand', () => {
	it('renders a plain command and its args as a shell string', () => {
		expect(renderCommand(ShellCommand.make('pnpm', 'add', 'lodash'))).toBe(
			'pnpm add lodash',
		);
	});

	it('quotes args containing shell-significant characters', () => {
		expect(renderCommand(ShellCommand.make('pnpm', 'run', 'a b'))).toBe(
			"pnpm run 'a b'",
		);
	});

	it('throws for a piped command, which it does not support', () => {
		const piped = ShellCommand.make('echo', 'hi').pipe(
			ShellCommand.pipeTo(ShellCommand.make('cat')),
		);
		expect(() => renderCommand(piped)).toThrow('PipedCommand is not supported');
	});

	// Regression coverage for a bug where `pm add -F @repo/db agentation`
	// printed "Running: pnpm add agentation" — the filter reached the actual
	// pnpm invocation (buildAddCommand assembles it correctly) but was silently
	// dropped from the logged line because add.ts/remove.ts built that line by
	// hand instead of rendering the same `Command` that gets executed. Fixed by
	// having every caller derive the log from `renderCommand(cmd)`.
	describe('regression: logged line matches the executed command', () => {
		it('pnpm add with a filter renders the filter that will actually run', () => {
			const cmd = Effect.runSync(
				pnpmPackageManager.buildAddCommand(['agentation'], false, ['@repo/db']),
			);
			expect(renderCommand(cmd)).toBe("pnpm -F '@repo/db' add agentation");
		});

		it('pnpm remove with a filter renders the filter that will actually run', () => {
			const cmd = Effect.runSync(
				pnpmPackageManager.buildRemoveCommand(['agentation'], ['@repo/db']),
			);
			expect(renderCommand(cmd)).toBe("pnpm -F '@repo/db' remove agentation");
		});

		it('bun add with a filter renders --filter in its after-subcommand position', () => {
			const cmd = Effect.runSync(
				bunPackageManager.buildAddCommand(['agentation'], true, ['@repo/db']),
			);
			expect(renderCommand(cmd)).toBe(
				"bun add --filter '@repo/db' -D agentation",
			);
		});

		it('npm remove with a filter renders -w in its after-subcommand position', () => {
			const cmd = Effect.runSync(
				npmPackageManager.buildRemoveCommand(['agentation'], ['@repo/db']),
			);
			expect(renderCommand(cmd)).toBe("npm uninstall -w '@repo/db' agentation");
		});
	});
});
