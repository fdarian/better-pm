import type { Command as ShellCommand } from '@effect/platform';

/** Minimal POSIX-ish shell quoting, just enough to make a logged command copy-pasteable. */
const shQuote = (arg: string) =>
	/^[A-Za-z0-9_./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;

/**
 * Renders a `Command` as the shell string it will actually execute. Always
 * derive logged output from the same `Command` passed to `runShellCommand`
 * rather than reassembling a separate string — otherwise the two can drift
 * apart (e.g. a log line that forgets to mention `-F`/`--filter`).
 */
export function renderCommand(cmd: ShellCommand.Command): string {
	if (cmd._tag !== 'StandardCommand') {
		throw new Error('PipedCommand is not supported');
	}
	return [cmd.command, ...cmd.args].map(shQuote).join(' ');
}
