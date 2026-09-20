const fs = require('fs');
const babel = require('@babel/core');
const path = require('path');

async function run() {
    const [,, srcFile, outFile, configFile] = process.argv;

    if (!srcFile || !outFile || !configFile) {
        console.error('Usage: node babel_wrapper.js <src> <out> <config>');
        process.exit(1);
    }

    try {
        const configContent = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configContent);

        const result = await babel.transformFileAsync(srcFile, {
            ...config,
            filename: srcFile,
        });

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

