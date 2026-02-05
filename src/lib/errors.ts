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
