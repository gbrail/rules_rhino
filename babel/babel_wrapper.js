const fs = require('fs');
const babel = require('@babel/core');
const path = require('path');

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
        };

        if (nodeModulesRoot) {
            // Babel resolves plugins by walking node_modules up from its "cwd"
            // option, ignoring NODE_PATH. Point it at the node_modules the
            // build provides so plugins resolve identically on every platform.
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

