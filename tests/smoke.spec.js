// End-to-end smoke tests against live YouTube. YouTube changes its markup
// often; when these fail, a selector in content.js/styles.css likely needs
// updating.
import { test, expect, openVideo, primaryScroll } from './fixtures.js';

test('moves comments to the left column and splits the scrolling', async ({ page }) => {
    await openVideo(page);
    await expect(page.locator('#primary #primary-inner > #comments')).toBeAttached({ timeout: 20_000 });
    await expect(page.locator('#columns > #ycl-divider')).toBeAttached();
    // The window itself is locked; the panes scroll.
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
    await expect(page.locator('#ycl-jump')).toHaveText(/Comments/);
});

test('docks the player when scrolled away and undocks when back', async ({ page }) => {
    await openVideo(page);
    // Scroll to the comments so they load; before that the pane can be too
    // short to scroll the player out of view.
    await page.locator('#ycl-jump').click();
    await expect(page.locator('#comments ytd-comment-thread-renderer').first()).toBeAttached({ timeout: 20_000 });
    // Comments keep loading and resizing for a moment; keep scrolling to the
    // bottom until the player docks.
    await expect.poll(async () => {
        await primaryScroll(page, 99999);
        return page.evaluate(() => document.documentElement.classList.contains('ycl-docked'));
    }, { timeout: 15_000 }).toBe(true);
    await expect(page.locator('#ycl-jump')).toHaveText(/Back to video/);
    await primaryScroll(page, 0);
    await expect(page.locator('html')).not.toHaveClass(/ycl-docked/);
});

test('settings apply live: swap sides, column width, docking off', async ({ page, setSettings }) => {
    await openVideo(page);
    const left = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().left, sel);

    await setSettings({ swapSides: true });
    await expect(page.locator('html')).toHaveClass(/ycl-swap/);
    expect(await left('ytd-watch-flexy #secondary')).toBeLessThan(await left('ytd-watch-flexy #primary'));

    await setSettings({ sidebarWidth: 600 });
    await expect.poll(() => page.evaluate(() => document.querySelector('ytd-watch-flexy #secondary').offsetWidth)).toBe(600);

    await setSettings({ dock: false });
    await primaryScroll(page, 99999);
    await page.waitForTimeout(500);
    await expect(page.locator('html')).not.toHaveClass(/ycl-docked/);
});

test('turning it off restores YouTube and shows the OFF badge', async ({ page, worker, setSettings }) => {
    await openVideo(page);
    await setSettings({ enabled: false });
    await expect(page.locator('html')).not.toHaveClass(/ycl-/);
    await expect(page.locator('#primary #primary-inner > #comments')).not.toBeAttached();
    await expect(page.locator('#ycl-divider')).not.toBeAttached();
    expect(await worker.evaluate(() => chrome.action.getBadgeText({}))).toBe('OFF');

    await setSettings({ enabled: true });
    await expect(page.locator('html')).toHaveClass(/ycl-split/);
    expect(await worker.evaluate(() => chrome.action.getBadgeText({}))).toBe('');
});

test('theater mode keeps the page scrollable', async ({ page, setSettings }) => {
    await openVideo(page);
    await page.locator('ytd-watch-flexy').evaluate((f) => f.scrollIntoView());
    await page.keyboard.press('t');
    await expect(page.locator('ytd-watch-flexy')).toHaveAttribute('theater', '');
    await page.mouse.move(700, 600);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await setSettings({ theaterSplit: true });
    await expect(page.locator('html')).toHaveClass(/ycl-theater-split/);
});

test('popup shows the version and saves settings', async ({ page, extensionId, worker }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    const { version } = await worker.evaluate(() => chrome.runtime.getManifest());
    await expect(page.locator('#version')).toHaveText(`v${version}`);
    await expect(page.locator('#shortcut')).not.toBeEmpty();

    await page.getByLabel(/Hide Shorts/).check();
    expect(await worker.evaluate(() => chrome.storage.local.get('hideShorts'))).toEqual({ hideShorts: true });

    await page.locator('#enabled').uncheck();
    await expect(page.locator('#settings')).toHaveAttribute('disabled', '');
});

test('popup does not flag an up-to-date YouTube tab as stale', async ({ page, context, extensionId }) => {
    await openVideo(page);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    // The popup is a tab here, not the toolbar popup, so check the YouTube tab explicitly.
    const notice = await popup.evaluate(() => new Promise((resolve) => {
        chrome.tabs.query({ url: '*://www.youtube.com/*' }, ([tab]) => {
            checkTab(tab);
            setTimeout(() => resolve(!document.getElementById('stale-tab').hidden), 500);
        });
    }));
    expect(notice).toBe(false);
});
