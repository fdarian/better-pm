import { Effect } from 'effect';
import { UnsupportedFilterSelectorError } from '#src/lib/errors.ts';

/** Declares how a package manager's CLI accepts `-F/--filter`-style selectors. */
export type FilterSpec = {
	/** Flag spelling passed before each selector, e.g. `-F`, `--filter`, `-w`. */
	readonly flag: string;
	/** Whether the flag is placed before or after the resolved subcommand tokens. */
	readonly position: 'before-subcommand' | 'after-subcommand';
	/** Whether the PM understands pnpm's relational/glob/exclusion selector grammar. */
	readonly supportsSelectorSyntax: boolean;
};

/** Matches pnpm-style selector syntax that a plain workspace-name-or-path flag (npm's `-w`) can't express. */
const PNPM_SELECTOR_SYNTAX = /\.\.\.|\^|!|[{[*]/;

/**
 * Assembles the argv (excluding the binary) for a filtered command: validates
 * each selector against the spec, then places `flag selector` pairs before or
 * after `subcommand` per `spec.position`, followed by `trailingArgs`.
 */
export const assembleFilteredArgv = (
	spec: FilterSpec,
	subcommand: ReadonlyArray<string>,
	filters: ReadonlyArray<string>,
	trailingArgs: ReadonlyArray<string> = [],
): Effect.Effect<Array<string>, UnsupportedFilterSelectorError> =>
	Effect.gen(function* () {
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
