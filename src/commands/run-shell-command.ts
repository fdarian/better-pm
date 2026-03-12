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

/** Finds descendant PIDs that are in a different process group than the root */
function getOtherGroupDescendants(rootPid: number): number[] {
	const descendants = getDescendantPids(rootPid);
	if (descendants.length === 0) return [];
	try {
		const allPids = [rootPid, ...descendants];
		const output = execSync(
			`ps -o pid=,pgid= -p ${allPids.join(',')}`,
			{ encoding: 'utf-8' },
		);
		const rootPgid = rootPid; // detached child is its own process group leader
		return output
			.trim()
			.split('\n')
			.map((line) => {
				const parts = line.trim().split(/\s+/);
				return { pid: Number(parts[0]), pgid: Number(parts[1]) };
			})
			.filter((p) => p.pgid !== rootPgid && p.pid !== rootPid)
			.map((p) => p.pid);
	} catch {
		return descendants;
	}
}

/**
 * Spawns with detached: true so only pm receives terminal SIGINT.
 * On Ctrl+C, sends SIGTERM only to descendant processes in other process groups
 * (e.g. vite), avoiding signaling pnpm which would kill bun before it can clean up.
 * The exit cascades naturally: vite exits → bun exits → pnpm exits.
 */
export const runShellCommand = (cmd: ShellCommand.Command) =>
	Effect.uninterruptible(
		Effect.async<number, Error>((resume) => {
			const standard = cmd as ShellCommand.StandardCommand;
			const child = spawn(standard.command, standard.args as string[], {
				stdio: 'inherit',
				detached: true,
			});

			const forwardSigint = () => {
				const otherGroupPids = getOtherGroupDescendants(child.pid!);
				if (otherGroupPids.length > 0) {
					for (const p of otherGroupPids) {
						try {
							process.kill(p, 'SIGTERM');
						} catch {}
					}
				} else {
					// No separate process groups — kill the tree directly
					killTree(child.pid!, 'SIGTERM');
				}
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
		}),
	);
