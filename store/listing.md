# Store listing

Copy for the Chrome Web Store, Microsoft Edge Add-ons and Firefox Add-ons
(AMO). Upload `dist/youtube-split-scroll-<version>.zip` (from `npm run build`
or the GitHub release); the same ZIP works in all three stores.

## Name

YouTube Split Scroll: Comments Left & Docked Player

## Summary (max 132 characters)

Comments in the left column with independent scrolling; the player, title and actions dock to the right as you scroll.

## Category

- Chrome Web Store: Productivity → Tools (or "Accessibility")
- Edge Add-ons: Productivity
- AMO: Appearance

## Description

Read YouTube comments without losing the video.

YouTube puts the comments far down the page and scrolls everything together,
so reading comments pushes the player, title and Like/Subscribe buttons out of
sight. YouTube Split Scroll fixes the watch page layout:

• Comments sit in the left column, under the video.
• The left column (video and comments) and the right column (suggestions)
  scroll independently; the page itself doesn't move.
• Scroll down into the comments and the player, title and actions dock to the
  top of the right column, so you keep watching while you read.
• A "Comments" / "Back to video" button jumps between the two.

Make it yours (toolbar popup):
• Drag the line between the columns to resize them.
• Put the suggestions on the left instead.
• Choose when the player docks, or dock only the player.
• Hide Shorts from the suggestions.
• Optional split scrolling in theater mode.
• Alt+Shift+Y turns it on or off; an "OFF" badge shows when it's disabled.

Private by design: no data collection, no tracking, no network requests. The
only permission is storage, to remember your settings on your device.

Open source (MIT): https://github.com/Majid-Ali-Watto/youtube-split-scroll

## Single purpose (Chrome Web Store)

Rearranges the YouTube watch page so comments appear beside the video with
independent scrolling and a docked player.

## Permission justification

- `storage`: remembers the on/off switch and layout settings (column width,
  docking options, swap sides, hide Shorts, theater split) on the user's
  device.
- Host access (`www.youtube.com`, `host_permissions` and the content script):
  injects the stylesheet and script that rearrange the YouTube watch page, and
  lets the popup tell whether the open YouTube tab is still running an older
  version of the script after an update (it then offers to reload the tab).
  No data is read or sent anywhere.

## Data usage (Chrome Web Store privacy tab)

- Collects no user data in any category.
- Certify: not sold to third parties; not used or transferred for purposes
  unrelated to the single purpose; not used for creditworthiness or lending.
- Remote code: no.
- Privacy policy URL:
  https://github.com/Majid-Ali-Watto/youtube-split-scroll/blob/main/PRIVACY.md

## Firefox (AMO)

- Add-on ID: `youtube-split-scroll@majidev.netlify.app` (in `manifest.json`).
- Data collection: none (declared in `manifest.json`).
- Source code: not required (no minified or generated code).
- `web-ext lint` reports two expected warnings: `background.service_worker`
  (Chromium uses it; Firefox uses `background.scripts`) and
  `commands.openShortcutSettings` (feature-detected; older Firefox versions
  fall back to the browser's own shortcut page).

## Images

- Icon: `icons/icon128.png`.
- Small promo tile (Chrome Web Store, 440×280): `store/promo-440x280.png`.
  Re-render with `npm run icons` after changing `icons/icon.svg`.

## Screenshots

`docs/screenshots/top.png` and `docs/screenshots/docked.png` (1280×800 or
640×400 for the Chrome Web Store; crop or rescale as needed).

## Translations

Store name and description are read from `_locales/<lang>/messages.json`
(`extFullName`, `extDescription`). To add a language, copy `_locales/en/` to
`_locales/<code>/` and translate the `message` values.
