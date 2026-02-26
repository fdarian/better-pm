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

const changesetPublish = Bun.spawn(['bunx', 'changeset', 'publish'], {
	cwd: repoRoot,
	stdout: 'inherit',
	stderr: 'inherit',
});

const changesetExitCode = await changesetPublish.exited;

if (changesetExitCode !== 0) {
	throw new Error('Failed to run changeset publish');
}
