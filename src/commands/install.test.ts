import { Terminal } from '@effect/platform';
import { it } from '@effect/vitest';
import { Effect, Exit, Layer, Mailbox, Option } from 'effect';
import { afterEach, beforeEach, describe, expect } from 'vitest';
import { confirmRootInstall } from './install.ts';

const emptyArgs = {
	packages: [] as Array<{ name: string; relDir: string }>,
	pathSep: '/',
};

const makeUserInput = (
	char: string,
	opts?: { ctrl?: boolean },
): Terminal.UserInput => ({
	input: Option.some(char),
	key: {
		name: char.toLowerCase(),
		ctrl: opts?.ctrl ?? false,
		meta: false,
		shift: false,
	},
});

const makeTerminalLayer = (userInput: Terminal.UserInput) =>
	Layer.succeed(Terminal.Terminal, {
		columns: Effect.succeed(80),
		rows: Effect.succeed(24),
		isTTY: Effect.succeed(true),
		readInput: Effect.gen(function* () {
			const mailbox = yield* Mailbox.make<Terminal.UserInput>();
			mailbox.unsafeOffer(userInput);
			mailbox.unsafeDone(Exit.void);
			return mailbox as Mailbox.ReadonlyMailbox<Terminal.UserInput>;
		}),
		display: () => Effect.void,
		readLine: Effect.die('not implemented'),
	} as any);

const dummyTerminalLayer = makeTerminalLayer(makeUserInput('n'));

describe('confirmRootInstall', () => {
	let prevClaudeCode: string | undefined;

	beforeEach(() => {
		prevClaudeCode = process.env.CLAUDECODE;
	});

	afterEach(() => {
		if (prevClaudeCode === undefined) delete process.env.CLAUDECODE;
		else process.env.CLAUDECODE = prevClaudeCode;
	});

	describe('CLAUDECODE mode', () => {
		it.effect('returns false without prompting', () =>
			Effect.gen(function* () {
				process.env.CLAUDECODE = '1';
				const result = yield* confirmRootInstall(emptyArgs);
				expect(result).toBe(false);
			}).pipe(Effect.provide(dummyTerminalLayer)),
		);
	});

	describe('interactive mode', () => {
		beforeEach(() => {
			delete process.env.CLAUDECODE;
		});

		it.effect('returns true when user confirms with y', () =>
			Effect.gen(function* () {
				const result = yield* confirmRootInstall(emptyArgs);
				expect(result).toBe(true);
			}).pipe(Effect.provide(makeTerminalLayer(makeUserInput('y')))),
		);

		it.effect('returns false when user declines with n', () =>
			Effect.gen(function* () {
				const result = yield* confirmRootInstall(emptyArgs);
				expect(result).toBe(false);
			}).pipe(Effect.provide(makeTerminalLayer(makeUserInput('n')))),
		);
	});
});
