// Settings for `web-ext lint` / `web-ext build` (npm run lint / npm run build).
// Only the extension's own files go into the store ZIP.
export default {
    sourceDir: '.',
    artifactsDir: 'dist',
    ignoreFiles: [
        '.github',
        'dist',
        'docs',
        'node_modules',
        'scripts',
        'store',
        'tests',
        'test-results',
        'playwright-report',
        'icons/*.svg',
        '*.md',
        'package.json',
        'package-lock.json',
        'playwright.config.js',
        'web-ext-config.mjs',
    ],
};
