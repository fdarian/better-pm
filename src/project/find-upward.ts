import { Config, Effect, FileSystem, Path } from 'effect';

/** Traverse up from cwd to find a file, stopping at home dir or filesystem root */
export const findUpward = (filename: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		const homeDir = yield* Config.string('HOME');

		let currentDir = process.cwd();

		while (true) {
			const filePath = path.join(currentDir, filename);
			const exists = yield* fs.exists(filePath);
			if (exists) {
				return filePath;
			}

			if (currentDir === homeDir) {
				return yield* Effect.fail(new Error(`${filename} not found`));
			}

			const parentDir = path.dirname(currentDir);
			if (parentDir === currentDir) {
				return yield* Effect.fail(new Error(`${filename} not found`));
			}

			currentDir = parentDir;
		}
	});
