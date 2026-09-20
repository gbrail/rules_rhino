const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [,, pkgJson, pkgLock, outDir] = process.argv;

if (!pkgJson || !pkgLock || !outDir) {
    console.error('Usage: node npm_install.js <package.json> <package-lock.json> <outDir>');
    process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(pkgJson, path.join(outDir, 'package.json'));
fs.copyFileSync(pkgLock, path.join(outDir, 'package-lock.json'));

console.log('Running npm ci into ' + outDir);
// The action's sandbox makes the host read-only, so the npm cache must live
// inside the output directory. It is deleted again before the action ends, so
// it does not end up in the action output.
const cacheDir = path.join(outDir, '.npm-cache');
const res = spawnSync(
    'npm',
    ['ci', '--prefix', outDir, '--no-audit', '--no-fund', '--cache', cacheDir],
    { stdio: 'inherit', shell: process.platform === 'win32' }
);
if (res.error) {
    console.error('Failed to run npm: ' + res.error);
    process.exit(1);
}
if (res.status !== 0) {
    console.error('npm ci failed with exit code ' + res.status);
    process.exit(res.status);
}

// Verify that every package the lock file requires on this platform actually
// made it onto disk. An interrupted install (timeout, antivirus, OneDrive)
// leaves a partial node_modules that would otherwise surface much later as a
// missing Babel plugin.
const lock = JSON.parse(fs.readFileSync(path.join(outDir, 'package-lock.json'), 'utf8'));
const missing = [];
for (const [key, meta] of Object.entries(lock.packages || {})) {
    if (key.split('node_modules/').length !== 2) {
        continue;
    }
    if (meta.optional) {
        continue;
    }
    if (meta.os && !meta.os.includes(process.platform)) {
        continue;
    }
    if (meta.cpu && !meta.cpu.includes(process.arch)) {
        continue;
    }
    if (!fs.existsSync(path.join(outDir, key, 'package.json'))) {
        missing.push(key);
    }
}
if (missing.length) {
    console.error('npm ci finished, but these packages are missing from node_modules:');
    for (const name of missing) {
        console.error('  ' + name);
    }
    console.error('The install was probably interrupted; the build will re-run this action on the next invocation.');
    process.exit(1);
}

fs.rmSync(cacheDir, { recursive: true, force: true });
console.log('npm ci completed successfully.');
