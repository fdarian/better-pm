import { Command as ShellCommand } from '@effect/platform';
import { Effect } from 'effect';

export const runShellCommand = (cmd: ShellCommand.Command) =>
	Effect.scoped(
		Effect.gen(function* () {
			const childProcess = yield* cmd.pipe(
				ShellCommand.stdin('inherit'),
				ShellCommand.stdout('inherit'),
				ShellCommand.stderr('inherit'),
				ShellCommand.start,
			);

			// Forward SIGINT to the child's process group since @effect/platform
			// spawns with detached: true, putting the child in a separate group
			const pid = childProcess.pid as number;
			const forwardSigint = () => {
				try {
					process.kill(-pid, 'SIGINT');
				} catch {}
			};
			process.on('SIGINT', forwardSigint);
			yield* Effect.addFinalizer(() =>
				Effect.sync(() => process.removeListener('SIGINT', forwardSigint)),
			);

			return yield* childProcess.exitCode;
		}),
	);
