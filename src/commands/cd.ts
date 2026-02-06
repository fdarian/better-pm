import * as cli from '@effect/cli';
import { Path } from '@effect/platform';
import { Console, Effect, Option } from 'effect';
import { PackageNotFoundError } from '#src/lib/errors.ts';
import { formatWorkspaceTree } from '#src/lib/format-workspace-tree.ts';
import { PackageManagerService } from '#src/pm/package-manager-service.ts';

const packageNameArg = cli.Args.text({ name: 'package-name' }).pipe(
	cli.Args.optional,
);

const completionsOption = cli.Options.boolean('completions').pipe(
	cli.Options.withDefault(false),
);

export const cdCmd = cli.Command.make(
	'cd',
	{ packageName: packageNameArg, completions: completionsOption },
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
		}),
);
