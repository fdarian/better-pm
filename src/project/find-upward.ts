import { Config, Effect, FileSystem, Path } from 'effect';

export const findUpward = (
	filenames: string | ReadonlyArray<string>,
	startDir = process.cwd(),
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const homeDir = yield* Config.string('HOME');
		const candidates = typeof filenames === 'string' ? [filenames] : filenames;

		let currentDir = startDir;

		while (true) {
			for (const filename of candidates) {
				const filePath = path.join(currentDir, filename);
				const exists = yield* fs.exists(filePath);
				if (exists) {
					return filePath;
				}
			}

			const gitMarker = yield* fs.exists(path.join(currentDir, '.git'));
			if (gitMarker) {
				return yield* Effect.fail(new Error(`${filenames} not found`));
			}

			if (currentDir === homeDir) {
				return yield* Effect.fail(new Error(`${filenames} not found`));
			}

			const parentDir = path.dirname(currentDir);
			if (parentDir === currentDir) {
				return yield* Effect.fail(new Error(`${filenames} not found`));
			}

			currentDir = parentDir;
		}
	});
