import { Effect } from 'effect';
import { Argument, Command, Flag } from 'effect/unstable/cli';
import { filterOption } from '#src/commands/filter-option.ts';
import { runFilteredCommand } from '#src/commands/run-filtered-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const interactiveOption = Flag.boolean('i').pipe(Flag.withDefault(false));

const latestOption = Flag.boolean('latest').pipe(Flag.withDefault(false));

const argsArg = Argument.string('args').pipe(Argument.variadic());

const updateHandler = (args: {
	i: boolean;
	latest: boolean;
	args: ReadonlyArray<string>;
	filter: ReadonlyArray<string>;
}) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const extraArgs: Array<string> = [];
		if (args.i) extraArgs.push('-i');
		if (args.latest) extraArgs.push('--latest');
		extraArgs.push(...Array.from(args.args));
		const filters = Array.from(args.filter);
		yield* runFilteredCommand(pm, 'update', ['update'], filters, extraArgs);
	}).pipe(Effect.provide(PackageManagerLayer));

export const upCmd = Command.make(
	'up',
	{
		i: interactiveOption,
		latest: latestOption,
		args: argsArg,
		filter: filterOption,
	},
	updateHandler,
);

export const updateCmd = Command.make(
	'update',
	{
		i: interactiveOption,
		latest: latestOption,
		args: argsArg,
		filter: filterOption,
	},
	updateHandler,
);
