import { Console, Effect, Path } from 'effect';
import { Argument, Command, Flag } from 'effect/unstable/cli';
import { filterOption } from '#src/commands/filter-option.ts';
import { listPackageScripts } from '#src/commands/package-scripts.ts';
import { runFilteredCommand } from '#src/commands/run-filtered-command.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';
import { findUpward } from '#src/project/find-upward.ts';

const argsArg = Argument.string('args').pipe(Argument.variadic());

const completionsOption = Flag.boolean('completions').pipe(
	Flag.withDefault(false),
);

const listRunScriptCompletions = (filters: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const pm = yield* PackageManagerService;
		const path = yield* Path.Path;

		if (filters.length === 0) {
			const packageJsonPath = yield* findUpward('package.json');
			return yield* listPackageScripts(packageJsonPath);
		}

		if (filters.length !== 1) return [];

		const packages = yield* pm.listWorkspacePackages(pm.lockDir);
		const packageName = filters[0];
		const filteredPackage = packages.find(
			(workspacePackage) => workspacePackage.name === packageName,
		);
		if (filteredPackage === undefined) return [];

		return yield* listPackageScripts(
			path.join(pm.lockDir, filteredPackage.relDir, 'package.json'),
		);
	});

export const runCmd = Command.make(
	'run',
	{ args: argsArg, completions: completionsOption, filter: filterOption },
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const passthrough = Array.from(args.args);
			const filters = Array.from(args.filter);
			if (args.completions) {
				const scripts = yield* listRunScriptCompletions(filters);
				yield* Effect.forEach(scripts, (script) => Console.log(script), {
					concurrency: 'unbounded',
				});
				return;
			}
			yield* runFilteredCommand(pm, 'run', ['run'], filters, passthrough);
		}).pipe(Effect.provide(PackageManagerLayer)),
);
