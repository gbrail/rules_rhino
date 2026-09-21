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
// The npm cache must live inside the output directory so it works whether or
// not the host cache directory is writable. It is deleted again before the
// action ends, so it does not end up in the action output.
const cacheDir = path.join(outDir, '.npm-cache');
// Run npm as a plain node script instead of shelling out. Bazel actions run
// with a minimal environment (no PATH, no ComSpec on Windows), so "npm"
// cannot be resolved and shell:true cannot find cmd.exe. The npm that ships
// with Node can be located from process.execPath without a shell:
//   Windows (nodejs.org installer): <nodeDir>/node_modules/npm
//   nvm / Homebrew / tarball installs:  <nodeDir>/../lib/node_modules/npm
//   distro packages (Debian, ...):      resolve "npm" from PATH; npm-cli.js
//                                       sits next to the resolved script.
function findOnPath(name) {
    const dirs = (process.env.PATH || '').split(path.delimiter);
    for (const dir of dirs) {
        if (!dir) continue;
        const candidate = path.join(dir, name);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

function findNpmCli() {
    const nodeDir = path.dirname(process.execPath);
    const candidates = [
        path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    const npmExe = findOnPath('npm');
    if (npmExe) {
        try {
            const nextToNpm = path.join(
                path.dirname(fs.realpathSync(npmExe)), 'npm-cli.js');
            if (fs.existsSync(nextToNpm)) {
                return nextToNpm;
            }
        } catch (err) {
            // npm is not a resolvable link; fall through.
        }
    }
    return null;
}

const npmArgs = ['ci', '--prefix', outDir, '--no-audit', '--no-fund', '--cache', cacheDir];
const npmCli = findNpmCli();
let res;
if (npmCli) {
    res = spawnSync(process.execPath, [npmCli, ...npmArgs], { stdio: 'inherit' });
} else {
    // Last resort: hope npm is reachable on PATH via the system shell.
    res = spawnSync('npm', npmArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
}
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
