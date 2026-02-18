/**
 * SHOGUN — Frontend Build Script
 * Concatenates and minifies JS/CSS for production.
 *
 * Usage:
 *   npm run build          — one-time production build
 *   npm run build:watch    — watch mode for development
 *
 * Output:
 *   dist/backoffice.min.js   — all backoffice JS concatenated + minified
 *   dist/backoffice.min.css  — all backoffice CSS concatenated + minified
 *   dist/shared.min.css      — shared design system CSS
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'dist');
const isWatch = process.argv.includes('--watch');

if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

// ── CSS Bundle ──────────────────────────────────────────────

const cssFiles = {
    shared: [
        'css/tokens.css',
        'css/shared.css',
    ],
    backoffice: [
        'css/tokens.css',
        'css/shared.css',
        'backoffice/css/styles.css',
        'backoffice/css/modals.css',
    ]
};

function bundleCSS(name, files) {
    const combined = files
        .map(f => readFileSync(join(__dirname, f), 'utf-8'))
        .join('\n');

    return build({
        stdin: { contents: combined, loader: 'css' },
        outfile: join(dist, `${name}.min.css`),
        minify: true,
        bundle: false,
        write: true,
    });
}

// ── JS Bundle ───────────────────────────────────────────────

// Order matters: dependencies first
const jsFiles = [
    'js/config.js',
    'backoffice/js/utils.js',
    'backoffice/js/auth.js',
    'backoffice/js/api.js',
    'backoffice/js/modals.js',
    'backoffice/js/pedidos.js',
    'backoffice/js/parametros.js',
];

async function bundleJS() {
    const combined = jsFiles
        .map(f => readFileSync(join(__dirname, f), 'utf-8'))
        .join('\n;\n');

    return build({
        stdin: { contents: combined, loader: 'js' },
        outfile: join(dist, 'backoffice.min.js'),
        minify: true,
        bundle: false,
        target: ['es2020'],
        write: true,
    });
}

// ── Run ─────────────────────────────────────────────────────

async function run() {
    const t0 = performance.now();

    await Promise.all([
        bundleCSS('shared', cssFiles.shared),
        bundleCSS('backoffice', cssFiles.backoffice),
        bundleJS(),
    ]);

    const elapsed = (performance.now() - t0).toFixed(0);
    console.log(`\x1b[32m✓\x1b[0m Built in ${elapsed}ms → dist/`);

    // Show file sizes
    const files = ['shared.min.css', 'backoffice.min.css', 'backoffice.min.js'];
    for (const f of files) {
        const path = join(dist, f);
        if (existsSync(path)) {
            const size = readFileSync(path).length;
            const kb = (size / 1024).toFixed(1);
            console.log(`  ${f.padEnd(24)} ${kb} KB`);
        }
    }
}

if (isWatch) {
    const chokidar = await import('chokidar').catch(() => null);
    if (chokidar) {
        console.log('Watching for changes...');
        chokidar.default.watch([
            join(__dirname, 'css'),
            join(__dirname, 'backoffice/css'),
            join(__dirname, 'backoffice/js'),
            join(__dirname, 'js'),
        ], { ignoreInitial: true }).on('all', async () => {
            try { await run(); } catch (e) { console.error(e.message); }
        });
    } else {
        console.log('Install chokidar for watch mode: npm i -D chokidar');
    }
    await run();
} else {
    await run();
}
