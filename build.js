const esbuild = require('esbuild');
const watch = process.argv.includes('--watch');
const minify = process.argv.includes('--minify');

const configs = [
    {
        entryPoints: ['src/main.ts'],
        outfile: minify ? 'dist/mlmap.min.js' : 'dist/mlmap.js',
        bundle: true,
        sourcemap: !minify,
        minify,
    },
    {
        entryPoints: ['src/display/index.ts'],
        outfile: minify ? 'dist/mlmap-display.min.js' : 'dist/mlmap-display.js',
        bundle: true,
        sourcemap: !minify,
        minify,
    },
];

async function main() {
    if (watch) {
        const contexts = await Promise.all(configs.map(c => esbuild.context(c)));
        await Promise.all(contexts.map(c => c.watch()));
        console.log('[MLMap] Watching for changes...');
    } else {
        await Promise.all(configs.map(c => esbuild.build(c)));
        console.log('[MLMap] Build complete.');
    }
}

main().catch(e => { console.error(e); process.exit(1); });
