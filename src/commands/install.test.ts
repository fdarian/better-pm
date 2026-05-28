import { Terminal } from '@effect/platform';
import { Effect, Exit, Layer, Mailbox, Option } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { confirmRootInstall, shouldConfirmRootInstall } from './install.ts';

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
	} satisfies Terminal.Terminal);

const dummyTerminalLayer = makeTerminalLayer(makeUserInput('n'));

const runEffect = <A>(effect: Effect.Effect<A, unknown, Terminal.Terminal>) =>
	Effect.runPromise(effect.pipe(Effect.provide(dummyTerminalLayer)));

describe('shouldConfirmRootInstall', () => {
	const rootCtx = {
		type: 'root' as const,
		lockDir: '/repo',
		hasWorkspaces: true,
	};
	const packageCtx = {
		type: 'package' as const,
		lockDir: '/repo',
		packageName: 'my-pkg',
	};
	const baseOpts = {
		ctx: rootCtx,
		sure: false,
		scopedInstall: true,
	};

	it('returns true when at root, has workspaces, not sure, and scopedInstall is true', () => {
		expect(shouldConfirmRootInstall(baseOpts)).toBe(true);
	});

	it('returns false when scopedInstall is false', () => {
		expect(
			shouldConfirmRootInstall({ ...baseOpts, scopedInstall: false }),
		).toBe(false);
	});

	it('returns false when --sure is passed', () => {
		expect(shouldConfirmRootInstall({ ...baseOpts, sure: true })).toBe(false);
	});

	it('returns false when not at root', () => {
		expect(shouldConfirmRootInstall({ ...baseOpts, ctx: packageCtx })).toBe(
			false,
		);
	});

	it('returns false when there are no workspaces', () => {
		expect(
			shouldConfirmRootInstall({
				...baseOpts,
				ctx: { ...rootCtx, hasWorkspaces: false },
			}),
		).toBe(false);
	});
});

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
		it('returns false without prompting', async () => {
			process.env.CLAUDECODE = '1';
			const result = await runEffect(confirmRootInstall(emptyArgs));
			expect(result).toBe(false);
		});
	});

	describe('interactive mode', () => {
		beforeEach(() => {
			delete process.env.CLAUDECODE;
		});

		it('returns true when user confirms with y', async () => {
			const result = await Effect.runPromise(
				confirmRootInstall(emptyArgs).pipe(
					Effect.provide(makeTerminalLayer(makeUserInput('y'))),
				),
			);
			expect(result).toBe(true);
		});

		it('returns false when user declines with n', async () => {
			const result = await Effect.runPromise(
				confirmRootInstall(emptyArgs).pipe(
					Effect.provide(makeTerminalLayer(makeUserInput('n'))),
				),
			);
			expect(result).toBe(false);
		});
	});
});
