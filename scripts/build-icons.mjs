// Renders the extension icons and the store promo tile from the SVG sources.
//
//   npm run icons        (needs Playwright's Chromium: npm run test:install)
//
// - icons/icon.svg        -> icons/icon48.png, icons/icon128.png
// - icons/icon-small.svg  -> icons/icon16.png, icons/icon32.png
// - grey "off" variants   -> icons/icon-off16.png, icons/icon-off32.png
//                            (toolbar icon while the extension is disabled)
// - store/promo-440x280.png  Chrome Web Store small promo tile
//
// Each PNG is rendered at its exact size, so small icons use the
// pixel-aligned small design rather than a scaled-down large one.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const out = (path) => new URL(`../${path}`, import.meta.url).pathname;

const large = read('icons/icon.svg');
const small = read('icons/icon-small.svg');

// Off variant: swap the teal palette for greys.
const OFF_COLORS = { '#2dd4bf': '#c4ccca', '#0d9488': '#808c8a', '#115e59': '#4d5856' };
const toOff = (svg) => svg.replace(/#2dd4bf|#0d9488|#115e59/g, (c) => OFF_COLORS[c]);

const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const ICONS = [
    { svg: small, size: 16, file: 'icons/icon16.png' },
    { svg: small, size: 32, file: 'icons/icon32.png' },
    { svg: large, size: 48, file: 'icons/icon48.png' },
    { svg: large, size: 128, file: 'icons/icon128.png' },
    { svg: toOff(small), size: 16, file: 'icons/icon-off16.png' },
    { svg: toOff(small), size: 32, file: 'icons/icon-off32.png' },
];

const PROMO = `<!doctype html>
<html><head><style>
  html, body { margin: 0; }
  body {
    width: 440px; height: 280px; box-sizing: border-box; padding: 36px 34px;
    display: flex; flex-direction: column; justify-content: center; gap: 18px;
    background:
      radial-gradient(circle at 85% 15%, rgba(45, 212, 191, 0.55), transparent 55%),
      linear-gradient(135deg, #115e59 0%, #0f766e 50%, #0d9488 100%);
    color: #fff; font-family: Inter, Roboto, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    overflow: hidden;
  }
  .row { display: flex; align-items: center; gap: 18px; }
  img { width: 84px; height: 84px; border-radius: 19px;
        box-shadow: 0 0 0 3px rgba(255,255,255,0.3), 0 10px 24px rgba(0,0,0,0.3); }
  h1 { margin: 0; font-size: 30px; line-height: 1.1; font-weight: 800; letter-spacing: -0.02em; }
  p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; white-space: nowrap; }
  ul { display: flex; gap: 8px; margin: 0; padding: 0; list-style: none; }
  li { padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.16);
       font-size: 13px; font-weight: 600; white-space: nowrap; }
</style></head><body>
  <div class="row">
    <img src="${dataUri(large)}" alt="">
    <div><h1>YouTube<br>Split Scroll</h1><p>Read comments without losing the video.</p></div>
  </div>
  <ul><li>Comments left</li><li>Independent scroll</li><li>Docked player</li></ul>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const { svg, size, file } of ICONS) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">
        <img src="${dataUri(svg)}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await page.locator('img').evaluate((img) => img.decode());
    await page.screenshot({ path: out(file), omitBackground: true });
    console.log(`${file} (${size}x${size})`);
}

await page.setViewportSize({ width: 440, height: 280 });
await page.setContent(PROMO);
await page.locator('img').evaluate((img) => img.decode());
await page.screenshot({ path: out('store/promo-440x280.png') });
console.log('store/promo-440x280.png (440x280)');

await browser.close();
