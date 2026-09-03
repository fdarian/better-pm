import { Effect } from 'effect';
import {
	UnsupportedFilterOperationError,
	UnsupportedFilterSelectorError,
} from '#src/lib/errors.ts';

/** Operations that can be scoped with -F/--filter. */
export type FilterOperation =
	| 'install'
	| 'add'
	| 'remove'
	| 'run'
	| 'update'
	| 'exec'
	| 'why'
	| 'link'
	| 'unlink'
	| 'ls';

/** Declares how a package manager's CLI accepts `-F/--filter`-style selectors. */
export type FilterSpec = {
	/** Flag spelling passed before each selector, e.g. `-F`, `--filter`, `-w`. */
	readonly flag: string;
	/** Whether the flag is placed before or after the resolved subcommand tokens. */
	readonly position: 'before-subcommand' | 'after-subcommand';
	/** Whether the PM understands pnpm's relational/glob/exclusion selector grammar. */
	readonly supportsSelectorSyntax: boolean;
	/** Operations this PM's CLI can't scope with a filter, verified against the real binary. */
	readonly unsupportedOperations: ReadonlySet<FilterOperation>;
};

/** Matches pnpm-style selector syntax that a plain workspace-name-or-path flag (npm's `-w`) can't express. */
const PNPM_SELECTOR_SYNTAX = /\.\.\.|\^|!|[{[*]/;

/**
 * Assembles the argv (excluding the binary) for a filtered command: rejects
 * filters the PM can't honor for this operation at all, then validates each
 * selector against the spec, then places `flag selector` pairs before or
 * after `subcommand` per `spec.position`, followed by `trailingArgs`.
 */
export const assembleFilteredArgv = (
	spec: FilterSpec,
	pmName: string,
	operation: FilterOperation,
	subcommand: ReadonlyArray<string>,
	filters: ReadonlyArray<string>,
	trailingArgs: ReadonlyArray<string> = [],
): Effect.Effect<
	Array<string>,
	UnsupportedFilterSelectorError | UnsupportedFilterOperationError
> =>
	Effect.gen(function* () {
		if (filters.length > 0 && spec.unsupportedOperations.has(operation)) {
			return yield* new UnsupportedFilterOperationError(pmName, operation);
		}

		if (!spec.supportsSelectorSyntax) {
			const unsupported = filters.find((filter) =>
				PNPM_SELECTOR_SYNTAX.test(filter),
			);
			if (unsupported !== undefined) {
				return yield* new UnsupportedFilterSelectorError(unsupported);
			}
		}

		const filterArgs = filters.flatMap((filter) => [spec.flag, filter]);
		return spec.position === 'before-subcommand'
			? [...filterArgs, ...subcommand, ...trailingArgs]
			: [...subcommand, ...filterArgs, ...trailingArgs];
	});
