import { Data } from 'effect';

export class NoPackageManagerDetectedError extends Data.TaggedError(
	'NoPackageManagerDetectedError',
)<{
	message: string;
}> {
	constructor() {
		super({
			message:
				'No lock file found. Could not detect package manager (pnpm, bun, or npm).',
		});
	}
}

export class PackageNotFoundError extends Data.TaggedError(
	'PackageNotFoundError',
)<{
	message: string;
}> {
	constructor(packageName: string, treeLines: Array<string>) {
		super({
			message: `Package "${packageName}" not found. Available packages:\n${treeLines.map((l) => `  ${l}`).join('\n')}`,
		});
	}
}

export class UnsupportedFilterSelectorError extends Data.TaggedError(
	'UnsupportedFilterSelectorError',
)<{
	message: string;
}> {
	constructor(selector: string) {
		super({
			message: `npm doesn't support the filter selector "${selector}". npm's -w only accepts a workspace name or a directory path — no globs, relational traversal ("...", "^"), or "!" exclusion.`,
		});
	}
}
