import { join } from 'node:path';

const repoRoot = join(import.meta.dir, '..');

const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64'];

for (const platform of platforms) {
	const packageDir = join(repoRoot, 'npm', `better-pm-${platform}`);
	const packageJsonPath = join(packageDir, 'package.json');
	const packageJson = await Bun.file(packageJsonPath).json();
	const version = packageJson.version;

	const checkPublished = Bun.spawn(
		['npm', 'view', `better-pm-${platform}@${version}`, 'version'],
		{
			stdout: 'inherit',
			stderr: 'inherit',
		},
	);

	const checkExitCode = await checkPublished.exited;

	if (checkExitCode === 0) {
		console.log(`better-pm-${platform}@${version} already published, skipping`);
		continue;
	}

	const publish = Bun.spawn(['npm', 'publish', '--access', 'public'], {
		cwd: packageDir,
		stdout: 'inherit',
		stderr: 'inherit',
	});

	const publishExitCode = await publish.exited;

	if (publishExitCode !== 0) {
		throw new Error(`Failed to publish better-pm-${platform}`);
	}
}

// The platform packages above are only published (or confirmed already
// published) at this point, so root package.json can't declare them as
// optionalDependencies any earlier in the pipeline — pnpm would fail to
// resolve them. Inject the pin here, directly into the tarball that
// `changeset publish` ships, then restore the working tree regardless of
// outcome.
const packageJsonPath = join(repoRoot, 'package.json');
const originalPackageJson = await Bun.file(packageJsonPath).text();
const packageJson = JSON.parse(originalPackageJson);

packageJson.optionalDependencies = Object.fromEntries(
	platforms.map((platform) => [`better-pm-${platform}`, packageJson.version]),
);

await Bun.write(
	packageJsonPath,
	JSON.stringify(packageJson, null, '\t') + '\n',
);

try {
	// Must not go through `pnpm exec`/`pnpm run`: pnpm verifies pnpm-lock.yaml
	// is in sync with package.json before launching a subprocess, and the
	// optionalDependencies pin above is deliberately absent from the lockfile
	// at this point. Any pnpm-launched process would abort with
	// ERR_PNPM_OUTDATED_LOCKFILE, so call the installed binary directly.
	const changesetPublish = Bun.spawn(
		[join(repoRoot, 'node_modules', '.bin', 'changeset'), 'publish'],
		{
			cwd: repoRoot,
			stdout: 'inherit',
			stderr: 'inherit',
		},
	);

	const changesetExitCode = await changesetPublish.exited;

	if (changesetExitCode !== 0) {
		throw new Error('Failed to run changeset publish');
	}
} finally {
	await Bun.write(packageJsonPath, originalPackageJson);
}
