import { Command as ShellCommand } from '@effect/platform';
import { execSync, spawn } from 'child_process';
import { Effect, HashMap, Option } from 'effect';

function getDescendantPids(pid: number): number[] {
	if (process.platform === 'win32') return [];
	try {
		const children = execSync(`pgrep -P ${pid}`, {
			encoding: 'utf-8',
			timeout: 3000,
		})
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
	if (process.platform === 'win32') return [];
	const descendants = getDescendantPids(rootPid);
	if (descendants.length === 0) return [];
	try {
		const allPids = [rootPid, ...descendants];
		const output = execSync(
			`ps -o pid=,pgid= -p ${allPids.join(',')}`,
			{ encoding: 'utf-8', timeout: 3000 },
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
			if ('_tag' in cmd && cmd._tag !== 'StandardCommand') {
				throw new Error(`PipedCommand is not supported`);
			}
			const standard = cmd as ShellCommand.StandardCommand;
			const env = Object.fromEntries(HashMap.toEntries(standard.env));
			const child = spawn(standard.command, standard.args as string[], {
				stdio: 'inherit',
				detached: true,
				cwd: Option.getOrUndefined(standard.cwd),
				env: { ...process.env, ...env },
				shell: standard.shell,
			});

			if (child.pid === undefined) {
				resume(
					Effect.fail(
						new Error(`Failed to spawn process: ${standard.command}`),
					),
				);
				return;
			}
			const pid = child.pid;

			const forwardSigint = () => {
				const otherGroupPids = getOtherGroupDescendants(pid);
				if (otherGroupPids.length > 0) {
					for (const p of otherGroupPids) {
						try {
							process.kill(p, 'SIGTERM');
						} catch {}
					}
				} else {
					// All descendants share the child's process group (detached: true makes
					// the child its own group leader). Sending SIGINT to the group (-pid) is
					// equivalent to terminal Ctrl+C — it atomically signals every process in
					// the group, unlike killTree which walks processes sequentially.
					try { process.kill(-pid, 'SIGINT'); } catch {}
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
				killTree(pid, 'SIGTERM');
			});
		}),
	);
