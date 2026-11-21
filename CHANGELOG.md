# Changelog

All notable changes to YouTube Split Scroll. Versions follow
[Semantic Versioning](https://semver.org/).

## 1.2.0 — 2026-11-21

### Added
- **Settings in the popup**: turn docking on/off, choose how far the player
  scrolls away before it docks (50–100%), and dock the player only or the
  player with its title and actions.
- **Resizable columns**: drag the line between the columns to set the width of
  the suggestions column (arrow keys work too; double-click resets). The width
  is remembered.
- **Swap sides**: suggestions on the left, video and comments on the right.
- **"Comments" / "Back to video" button** at the bottom of the left column.
- **Hide Shorts** in the suggestions (optional).
- **Split scrolling in theater mode** (optional): the page scrolls the wide
  player away, then each column scrolls on its own.
- **New logo and icons**: comments, a resizable divider and a docked player on
  a teal gradient; a pixel-aligned design for the 16/32px toolbar icon; the
  toolbar icon turns grey with an "OFF" badge while the extension is disabled.
  Store promo tile and an `npm run icons` script to re-render all of them.
- **Keyboard shortcut** Alt+Shift+Y toggles the extension (changeable in the
  browser's shortcut settings).
- Redesigned popup: one on/off switch in a branded header, settings grouped
  in cards with toggle switches, icons and short descriptions, a segmented
  control for what docks, and a compact developer row. Light and dark themes.
- Version number and a "What's new" link in the popup.
- The popup notices when the open YouTube tab is still running an older
  version (after installing, updating or reloading the extension) and offers
  to reload it.
- Firefox add-on ID, so the extension can be signed on addons.mozilla.org.
- Translation support (`_locales/`); English included.
- Build, lint and release tooling (`web-ext`), live smoke tests (Playwright)
  and GitHub Actions workflows.

### Fixed
- Theater mode: the page couldn't be scrolled at all while the extension was on.
- Live streams opened as `/live/…` or `/@channel/live` weren't handled.
- The player no longer docks over an open live chat.
- Docking or undocking near the bottom of the comments could make the left
  column jump back to the top.

### Changed
- The page observer is disconnected while the extension is off, and watches
  only the video page once it exists.

## 1.1

- Toolbar popup with an Enable/Disable switch, developer details and links.
- Extension icon, privacy policy and terms of use.

## 1.0

- Comments moved to the left column, independent scrolling of both columns,
  and the player, title and actions docked to the right column while reading
  comments.
