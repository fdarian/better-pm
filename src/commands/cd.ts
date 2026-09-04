import { Console, Effect, Option, Path } from 'effect';
import { Argument, Command, Flag } from 'effect/unstable/cli';
import { PackageNotFoundError } from '#src/lib/errors.ts';
import { formatWorkspaceTree } from '#src/lib/format-workspace-tree.ts';
import { PackageManagerLayer } from '#src/pm/layer.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const packageNameArg = Argument.string('package-name').pipe(Argument.optional);

const completionsOption = Flag.boolean('completions').pipe(
	Flag.withDefault(false),
);

const pathOption = Flag.boolean('path').pipe(
	Flag.withAlias('p'),
	Flag.withDefault(false),
);

export const cdCmd = Command.make(
	'cd',
	{
		packageName: packageNameArg,
		completions: completionsOption,
		path: pathOption,
	},
	(args) =>
		Effect.gen(function* () {
			const pm = yield* PackageManagerService;
			const path = yield* Path.Path;
			const packages = yield* pm.listWorkspacePackages(pm.lockDir);

			if (args.completions) {
				yield* Effect.forEach(packages, (pkg) => Console.log(pkg.name), {
					concurrency: 'unbounded',
				});
				return;
			}

			if (Option.isNone(args.packageName)) {
				yield* Console.log(pm.lockDir);
				return;
			}

			const packageName = args.packageName.value;
			const pkg = packages.find((p) => p.name === packageName);

			if (!pkg) {
				return yield* Effect.fail(
					new PackageNotFoundError(
						packageName,
						formatWorkspaceTree(packages, path.sep),
					),
				);
			}

			yield* Console.log(path.resolve(pm.lockDir, pkg.relDir));
		}).pipe(Effect.provide(PackageManagerLayer)),
);
