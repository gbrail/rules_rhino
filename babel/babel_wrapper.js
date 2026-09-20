const fs = require('fs');
const babel = require('@babel/core');
const path = require('path');

// Babel resolves plugin/preset names by walking node_modules up from its "cwd"
// option, which is unreliable inside a Bazel action (the action's working
// directory does not have the build's node_modules among its ancestors, and
// behavior varies by platform). Resolve the names here instead: a plain
// require from this file consults NODE_PATH, which the build points at the
// node_modules it installed. Babel loads absolute paths directly.
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
            return require.resolve(candidate);
        } catch (err) {
            // Try the next candidate.
        }
    }
    throw new Error(
        `Cannot resolve Babel ${type} "${name}" from the node_modules the build provides. ` +
        `Make sure it is listed in the package.json that the build installs.`
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
    const [,, srcFile, outFile, configFile, nodeModulesRoot] = process.argv;

    if (!srcFile || !outFile || !configFile) {
        console.error('Usage: node babel_wrapper.js <src> <out> <config> [nodeModules]');
        process.exit(1);
    }

    try {
        const configContent = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configContent);

        const options = {
            ...config,
            filename: srcFile,
            plugins: resolveNames('plugin', config.plugins),
            presets: resolveNames('preset', config.presets),
        };

        if (nodeModulesRoot) {
            options.cwd = path.dirname(path.resolve(nodeModulesRoot));
        }

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
