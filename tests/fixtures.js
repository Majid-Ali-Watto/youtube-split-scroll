// Fixtures: a Chromium context with the unpacked extension loaded, its
// background service worker, and helpers to change settings.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, chromium, expect } from '@playwright/test';

const extensionPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const test = base.extend({
    // eslint-disable-next-line no-empty-pattern
    context: async ({}, use) => {
        const context = await chromium.launchPersistentContext('', {
            // The bundled Chromium (not branded Chrome) still allows --load-extension.
            channel: 'chromium',
            headless: !process.env.HEADED,
            viewport: { width: 1400, height: 900 },
            locale: 'en-US',
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
        await use(context);
        await context.close();
    },
    worker: async ({ context }, use) => {
        let [worker] = context.serviceWorkers();
        worker ??= await context.waitForEvent('serviceworker');
        await use(worker);
    },
    extensionId: async ({ worker }, use) => {
        await use(new URL(worker.url()).host);
    },
    setSettings: async ({ worker }, use) => {
        await use((values) => worker.evaluate((v) => chrome.storage.local.set(v), values));
    },
});

export { expect };

// A short, stable video with comments enabled ("Me at the zoo").
export const VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

export async function openVideo(page) {
    await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded' });
    // Consent screen (EU and some other regions): accept so the video loads.
    const consent = page.getByRole('button', { name: /accept all|reject all/i }).first();
    if (await consent.isVisible({ timeout: 3000 }).catch(() => false)) await consent.click();
    await page.locator('ytd-watch-flexy #primary #player').waitFor();
    await expect(page.locator('html')).toHaveClass(/ycl-split/, { timeout: 20_000 });
}

export const primaryScroll = (page, top) =>
    page.evaluate((t) => { document.querySelector('ytd-watch-flexy #primary').scrollTop = t; }, top);
