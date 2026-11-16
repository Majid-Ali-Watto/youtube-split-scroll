# YouTube Split Scroll: Comments Left & Docked Player

## The problem it solves

YouTube's watch page makes you choose between the video and the conversation:

- **Comments end up in the wrong place.** They get pushed over to the right
  side of the page, mixed in with the suggested videos, instead of sitting
  under the video where you expect them.
- **Everything scrolls as one page.** Reading comments scrolls the player,
  title and Like/Subscribe buttons out of sight, and scrolling the suggested
  videos drags the rest of the page along with it.

This extension puts the comments back under the video, gives each side its own
scrollbar, and keeps the player, title and actions on screen (docked in the
right column) while you read comments.

## What it does (on YouTube watch pages)

- Moves the comments back to the left column, under the video.
- The left column (video, details, comments) and the right column (suggested
  videos / playlist) scroll independently; the page itself doesn't scroll.
- Once 90% of the video player has scrolled out of view on the left, the
  player, video title and channel/subscribe/like row dock to the top of the
  right column at its width. Suggested videos scroll beneath them. Scrolling
  back up returns them to the left column.
- Only the standard two-column view is changed. Theater mode, fullscreen and
  the narrow single-column layout keep YouTube's default behaviour.

## Screenshots

| Player at the top, right column scrolls independently | Scrolled down to the comments (player docked right) |
| --- | --- |
| ![Video player at the top of the left column while the suggested videos on the right scroll independently](docs/screenshots/top.png) | ![Comments on the left, player, title and actions docked above the suggestions on the right](docs/screenshots/docked.png) |

## Supported browsers

- Chromium-based desktop browsers: Google Chrome, Microsoft Edge, Brave,
  Opera, Vivaldi (any version with Manifest V3 support, Chrome 88+).
- Firefox 109+ (Manifest V3); loaded as a temporary add-on, see below.
- Not supported as-is: Safari (needs conversion with Xcode's Safari Web
  Extension tools) and mobile browsers.

## Installation: Chrome, Edge, Brave, Opera, Vivaldi

1. Extract this ZIP archive into a permanent folder on your computer.
2. Open the extensions page:
   - Chrome, Brave, Vivaldi: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Opera: `opera://extensions/`
3. Turn on **Developer mode** (toggle in the top-right or left sidebar).
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Open or refresh any YouTube video page.

## Installation: Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...** and select `manifest.json`.
3. Open or refresh any YouTube video page.

Temporary add-ons are removed when Firefox restarts; a permanent install
requires the extension to be signed through addons.mozilla.org.

## Updating after code changes

Click the reload icon on the extension's card (Firefox: **Reload** in
`about:debugging`), then refresh the YouTube tab.

## Files

| File            | Purpose                                                  |
| --------------- | -------------------------------------------------------- |
| `manifest.json` | Extension definition (Manifest V3, YouTube content script). |
| `content.js`    | Moves comments, docks/undocks the player and details.    |
| `styles.css`    | Independent-scroll layout and docked-stack styles.       |
| `icons/` | Extension icons (PNG sizes + `icon.svg` source). |
| `popup.html`, `popup.css` | Toolbar popup with developer details and links. |
| `PRIVACY.md`, `TERMS.md` | Privacy policy and terms of use. |

## Developer

**Majid Ali** is a Full Stack Web Developer based in Islamabad, Pakistan,
working with Vue.js, Nuxt.js, React and TypeScript on the frontend and
Python/FastAPI microservices (gRPC, Kafka, MSSQL, Redis, Docker) on the backend.

- Portfolio: [majidev.netlify.app](https://majidev.netlify.app)
- GitHub: [Majid-Ali-Watto](https://github.com/Majid-Ali-Watto)
- LinkedIn: [majid-ali-074b97245](https://www.linkedin.com/in/majid-ali-074b97245/)

Found a bug or have an idea? [Open an issue](https://github.com/Majid-Ali-Watto/youtube-split-scroll/issues).

## License

MIT, see [LICENSE](LICENSE).

- [Privacy Policy](PRIVACY.md)
- [Terms of Use](TERMS.md)
