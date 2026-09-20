const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const [,, srcFile, outFile, configFile, nodeModulesDir] = process.argv;

if (!srcFile || !outFile || !configFile || !nodeModulesDir) {
    console.error('Usage: node babel_wrapper.js <src> <out> <config> <nodeModulesDir>');
    process.exit(1);
}

// Every Babel package (core, plugins, presets) is resolved from the
// node_modules directory the build installed, on every platform, regardless
// of the action's working directory or anything present on the host.
// Rooted at the package.json npm copies into the directory; Node's module
// walk then finds <nodeModulesDir>/node_modules.
const req = createRequire(path.join(path.resolve(nodeModulesDir), 'package.json'));

function resolveBabelItem(type, name) {
    if (path.isAbsolute(name)) {
        return name;
    }
    if (name.startsWith('module:')) {
        return name.slice('module:'.length);
    }
    const candidates = [];
    if (!name.startsWith('@') && !name.includes('/')) {
        candidates.push(`babel-${type}-${name}`);
    }
    candidates.push(name);
    for (const candidate of candidates) {
        try {
            return req.resolve(candidate);
        } catch (err) {
            // Try the next candidate.
        }
    }
    throw new Error(
        `Cannot resolve Babel ${type} "${name}" in ${nodeModulesDir}. ` +
        `Make sure it is listed in the package.json you pass to npm_install.`
    );
}

function resolveNames(type, items) {
    if (!items) {
        return items;
    }
    return items.map((entry) =>
        Array.isArray(entry) ? [resolveBabelItem(type, entry[0]), ...entry.slice(1)]
            : resolveBabelItem(type, entry));
}

async function run() {
    try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

        const options = {
            ...config,
            filename: srcFile,
            plugins: resolveNames('plugin', config.plugins),
            presets: resolveNames('preset', config.presets),
            cwd: nodeModulesDir,
        };

        const babel = req('@babel/core');
        const result = await babel.transformFileAsync(srcFile, options);

        if (result && result.code) {
            fs.writeFileSync(outFile, result.code);
        } else {
            console.error(`Error preprocessing ${srcFile}: Babel returned null (the file was likely ignored by configuration).`);
            process.exit(1);
        }
    } catch (err) {
        console.error(`Babel transformation failed for ${srcFile}:`);
        console.error(err);
        process.exit(1);
    }
}

run();
