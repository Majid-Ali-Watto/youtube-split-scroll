// Smoke tests: load the unpacked extension into Chromium and check it against
// live YouTube. Run with `npm test` (after `npm run test:install` once).
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'tests',
    timeout: 90_000,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        viewport: { width: 1400, height: 900 },
        trace: 'retain-on-failure',
    },
});
