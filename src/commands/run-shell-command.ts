import { Command as ShellCommand } from '@effect/platform';
import { execSync, spawn } from 'child_process';
import { Effect } from 'effect';

function getDescendantPids(pid: number): number[] {
	try {
		const children = execSync(`pgrep -P ${pid}`, { encoding: 'utf-8' })
			.trim()
			.split('\n')
			.filter(Boolean)
			.map(Number);
		return children.flatMap((child) => [child, ...getDescendantPids(child)]);
	} catch {
		return [];
	}
}

function killTree(pid: number, signal: NodeJS.Signals) {
	const pids = [pid, ...getDescendantPids(pid)];
	for (const p of pids) {
		try {
			process.kill(p, signal);
		} catch {}
	}
}

/**
 * Spawns with detached: true so only pm receives terminal SIGINT,
 * then forwards the signal to the entire child process tree.
 * This handles multi-level trees where descendants create their own process groups.
 */
export const runShellCommand = (cmd: ShellCommand.Command) =>
	Effect.async<number, Error>((resume) => {
		const standard = cmd as ShellCommand.StandardCommand;
		const child = spawn(standard.command, standard.args as string[], {
			stdio: 'inherit',
			detached: true,
		});

		const forwardSigint = () => {
			killTree(child.pid!, 'SIGINT');
		};
		process.on('SIGINT', forwardSigint);

		child.on('close', (code) => {
			process.removeListener('SIGINT', forwardSigint);
			resume(Effect.succeed(code ?? 1));
		});
		child.on('error', (err) => {
			process.removeListener('SIGINT', forwardSigint);
			resume(Effect.fail(err));
		});
		return Effect.sync(() => {
			process.removeListener('SIGINT', forwardSigint);
			killTree(child.pid!, 'SIGTERM');
		});
	});
