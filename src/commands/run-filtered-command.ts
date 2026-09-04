import { Console, Effect } from 'effect';
import { ChildProcess } from 'effect/unstable/process';
import { runShellCommand } from '#src/commands/run-shell-command.ts';
import {
	assembleFilteredArgv,
	type FilterOperation,
	type FilterSpec,
} from '#src/pm/filter-argv.ts';

/**
 * Shared tail for passthrough commands (run/exec/why/unlink/ls/up): assembles
 * the filtered argv for `pm`'s CLI, logs it, and executes it. Callers resolve
 * their own subcommand tokens, trailing args, and any PM-specific guards
 * (e.g. exec's bun→x swap, why's npm guard, ls's `bun pm ls`) before calling
 * this.
 */
export const runFilteredCommand = (
	pm: { readonly name: string; readonly filterSpec: FilterSpec },
	operation: FilterOperation,
	subcommand: ReadonlyArray<string>,
	filters: ReadonlyArray<string>,
	trailingArgs: ReadonlyArray<string> = [],
) =>
	Effect.gen(function* () {
		const argv = yield* assembleFilteredArgv(
			pm.filterSpec,
			pm.name,
			operation,
			subcommand,
			filters,
			trailingArgs,
		);
		const cmd = ChildProcess.make(pm.name, argv);
		yield* Console.log(`Running: ${pm.name} ${argv.join(' ')}`);
		yield* runShellCommand(cmd);
	});
