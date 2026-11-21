// YouTube Split Scroll
// Author: Majid Ali (https://majidev.netlify.app)
// License: MIT

/*
 * Settings come from chrome.storage.local (defaults in settings.js) and are
 * changed from the toolbar popup or the keyboard shortcut. Until the stored
 * values have been read the extension stays off, then applySettings() sets the
 * real state; later changes apply immediately (see onChanged at the bottom).
 */
let settings = { ...YSS_DEFAULTS, enabled: false };

const msg = (key, fallback) => chrome.i18n.getMessage(key) || fallback;

// Video pages: /watch?v=…, plus live streams opened as /live/<id> or /@channel/live.
function isWatchPage() {
    const path = location.pathname;
    return path === '/watch' || path.startsWith('/live/') || /^\/@[^/]+\/live\/?$/.test(path);
}

function getFlexy() {
    return document.querySelector('ytd-watch-flexy');
}

function mastheadHeight() {
    return document.querySelector('#masthead-container')?.offsetHeight || 56;
}

/*
 * Which layout applies right now:
 * - 'split':   standard two-column view; the window is locked and both columns
 *              scroll independently, with docking.
 * - 'theater': theater mode with the theater split setting on; the window
 *              scrolls the wide player away, then the columns scroll
 *              independently below it. No docking (the player is full width).
 * - 'off':     YouTube's default (extension off, fullscreen, narrow
 *              single-column layout, or theater mode with the setting off).
 */
function layoutMode(flexy) {
    if (!settings.enabled || !isWatchPage() || !flexy) return 'off';
    if (flexy.hasAttribute('fullscreen') || !flexy.hasAttribute('is-two-columns_')) return 'off';
    if (flexy.hasAttribute('theater')) return settings.theaterSplit ? 'theater' : 'off';
    return 'split';
}

/* ---------------------------------------------------------------- comments */

// Where each moved #comments element lived, so turning the extension off can
// put it back exactly where YouTube had it.
const commentsHome = new WeakMap();

function moveCommentsToLeft() {
    const watchFlexy = getFlexy();
    if (!watchFlexy) return;

    const primaryInner = watchFlexy.querySelector('#primary #primary-inner') || watchFlexy.querySelector('#primary');
    const comments = watchFlexy.querySelector('#comments');

    if (primaryInner && comments && comments.parentElement !== primaryInner) {
        commentsHome.set(comments, { parent: comments.parentElement, next: comments.nextSibling });
        primaryInner.appendChild(comments);
    }
}

function restoreComments() {
    const comments = document.querySelector('ytd-watch-flexy #comments');
    const home = comments && commentsHome.get(comments);
    if (home?.parent.isConnected) {
        home.parent.insertBefore(comments, home.next?.parentNode === home.parent ? home.next : null);
        commentsHome.delete(comments);
    }
}

/* ----------------------------------------------------------------- docking */

/*
 * Docking: once the dock threshold (default 90%) of the player is scrolled out
 * of the left pane, the player, the video title and the channel/subscribe/like
 * row are pinned (position: fixed, see styles.css) as a stack over the top of
 * the right column, matching its width. With "player only" docking the title
 * and row stay in the left pane. The original boxes stay in the left pane as
 * fixed-height spacers so the left scroll position — and thus this dock
 * condition — doesn't jump when they leave the flow.
 */
const DOCKED = 'ycl-docked';
let spacerRatio = 0; // undocked player height / width, captured at dock time

function getDockParts() {
    const flexy = getFlexy();
    return {
        flexy,
        primary: flexy?.querySelector('#primary'),
        secondary: flexy?.querySelector('#secondary'),
        player: flexy?.querySelector('#primary #player'),
        playerBox: flexy?.querySelector('#primary #player-container-outer'),
        title: flexy?.querySelector('#primary ytd-watch-metadata #title'),
        topRow: flexy?.querySelector('#primary ytd-watch-metadata #top-row'),
        comments: flexy?.querySelector('#primary #comments'),
    };
}

// Live streams and premieres show their chat at the top of the right column;
// docking would cover it, so the player stays in the left pane while it's open.
function hasOpenLiveChat(flexy, secondary) {
    if (flexy?.hasAttribute('live-chat-present-and-expanded')) return true;
    const chat = secondary?.querySelector('ytd-live-chat-frame');
    return Boolean(chat && !chat.hasAttribute('collapsed') && chat.offsetHeight > 0);
}

// Stack offsets for the docked parts; the right column shrinks by their total
// so suggestions scroll below them. Heights follow the docked width.
function syncDockHeights() {
    const root = document.documentElement;
    const docked = root.classList.contains(DOCKED);
    const withDetails = docked && settings.dockParts !== 'player';
    const { playerBox, title, topRow } = getDockParts();
    const h = (el, on) => `${on && el ? el.offsetHeight : 0}px`;
    root.style.setProperty('--ycl-player-h', h(playerBox, docked));
    root.style.setProperty('--ycl-title-h', h(title, withDetails));
    root.style.setProperty('--ycl-toprow-h', h(topRow, withDetails));
}

function setDocked(dock, { primary, player, title }) {
    const root = document.documentElement;
    const info = title?.parentElement;
    // Clearing the spacers below shortens the pane for a moment, which would
    // clamp the scroll position; it is restored once the swap is complete.
    const scrollTop = primary?.scrollTop ?? 0;
    if (!dock) {
        if (player) player.style.height = '';
        if (info) info.style.paddingTop = '';
    }
    // Content after the docked parts must not move, or the pane's height (and
    // scroll position, when at the bottom) would jump: measure where the last
    // element sits before and after, and pad the info block by the difference.
    // This also absorbs margins the docked parts took with them.
    // Positions are measured in content coordinates (+ scrollTop) because the
    // browser clamps scrollTop the moment the pane gets shorter.
    const marker = primary?.querySelector('#primary-inner')?.lastElementChild;
    const contentTop = () => marker.getBoundingClientRect().top + primary.scrollTop;
    const markerTop = marker ? contentTop() : 0;
    root.classList.toggle(DOCKED, dock);
    if (dock && info && marker) {
        info.style.paddingTop = `${Math.max(0, markerTop - contentTop())}px`;
    }
    if (primary) primary.scrollTop = scrollTop;
    syncDockHeights();
    // Let YouTube's player recompute its video size for the new box.
    window.dispatchEvent(new Event('resize'));
}

function updateDock() {
    const root = document.documentElement;
    const parts = getDockParts();
    const { flexy, primary, secondary, player } = parts;
    const mode = layoutMode(flexy);
    const wasDocked = root.classList.contains(DOCKED);
    // While docked, #player is the spacer holding the player's original box.
    const playerRect = player?.getBoundingClientRect();
    const threshold = settings.dockThreshold / 100;

    const shouldDock = Boolean(
        mode === 'split' && settings.dock && primary && secondary && player
        && !hasOpenLiveChat(flexy, secondary)
        // An unrendered player reports a zero rect; never dock on that.
        && playerRect.height > 0
        // Dock once the threshold share of the player is scrolled above the pane.
        && playerRect.top + playerRect.height * threshold <= primary.getBoundingClientRect().top
    );

    if (shouldDock) {
        if (!wasDocked) spacerRatio = player.offsetHeight / player.offsetWidth;
        player.style.height = `${player.offsetWidth * spacerRatio}px`;

        const target = (secondary.querySelector('#secondary-inner') || secondary).getBoundingClientRect();
        root.style.setProperty('--ycl-dock-top', `${primary.getBoundingClientRect().top}px`);
        root.style.setProperty('--ycl-dock-left', `${target.left}px`);
        root.style.setProperty('--ycl-dock-width', `${target.width}px`);
    }

    if (shouldDock !== wasDocked) setDocked(shouldDock, parts);
    updateJumpButton(mode, parts, shouldDock);
}

const dockedHeightObserver = new ResizeObserver(syncDockHeights);
const observedDockParts = new WeakSet();

function observeDockParts() {
    const { playerBox, title, topRow } = getDockParts();
    for (const el of [playerBox, title, topRow]) {
        if (el && !observedDockParts.has(el)) {
            dockedHeightObserver.observe(el);
            observedDockParts.add(el);
        }
    }
}

let dockFrame = 0;
function scheduleDockUpdate() {
    if (dockFrame) return;
    dockFrame = requestAnimationFrame(() => {
        dockFrame = 0;
        updateDock();
    });
}

/* ------------------------------------------------- "Comments" / "Back to video" */

/*
 * A floating button at the bottom of the left pane: "Comments" while the
 * comments are still below the fold, "Back to video" while the player is
 * docked. Hidden otherwise, and outside the split layout.
 */
function ensureJumpButton() {
    if (document.getElementById('ycl-jump')) return;
    const button = document.createElement('button');
    button.id = 'ycl-jump';
    button.type = 'button';
    button.hidden = true;
    button.addEventListener('click', () => {
        const { primary, comments } = getDockParts();
        if (!primary) return;
        if (button.dataset.action === 'comments' && comments) {
            // Instant, not smooth: the jump usually docks the player on the
            // way down, and Chrome abandons a smooth scroll (back to 0) when
            // docking shortens the pane mid-animation while comments load.
            primary.scrollTop += comments.getBoundingClientRect().top - primary.getBoundingClientRect().top;
        } else {
            primary.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    document.body.appendChild(button);
}

function updateJumpButton(mode, { primary, comments }, docked) {
    const button = document.getElementById('ycl-jump');
    if (!button) return;

    let action = '';
    if (mode === 'split' && settings.jumpButtons && primary) {
        const pane = primary.getBoundingClientRect();
        if (docked) {
            action = 'top';
        } else if (comments?.offsetHeight > 0 && comments.getBoundingClientRect().top > pane.bottom - 40) {
            action = 'comments';
        }
        if (action) button.style.setProperty('--ycl-jump-x', `${pane.left + pane.width / 2}px`);
    }

    // Touch the DOM only on change; this runs on every scroll frame.
    if (button.dataset.action === action) return;
    button.dataset.action = action;
    button.hidden = !action;
    if (action) {
        button.textContent = action === 'top'
            ? `↑ ${msg('jumpToVideo', 'Back to video')}`
            : `↓ ${msg('jumpToComments', 'Comments')}`;
    }
}

function removeJumpButton() {
    document.getElementById('ycl-jump')?.remove();
}

/* ------------------------------------------------------- resizable divider */

/*
 * A drag handle between the two columns sets the suggestions column width
 * (settings.sidebarWidth, saved on release). Arrow keys nudge it, double-click
 * resets to YouTube's default width.
 */
function clampSidebarWidth(width) {
    const columns = getFlexy()?.querySelector('#columns');
    const max = (columns?.clientWidth ?? Infinity) - YSS_LIMITS.primaryMin - 32;
    return Math.round(Math.max(YSS_LIMITS.sidebarMin, Math.min(width, max)));
}

function applySidebarWidth() {
    const root = document.documentElement;
    const custom = settings.enabled && isWatchPage() && settings.sidebarWidth > 0;
    root.classList.toggle('ycl-custom-width', custom);
    if (custom) root.style.setProperty('--ycl-sidebar-w', `${settings.sidebarWidth}px`);
}

let resizeFrame = 0;
function previewSidebarWidth(width) {
    settings.sidebarWidth = clampSidebarWidth(width);
    applySidebarWidth();
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        // The player sizes itself to its container on window resize.
        window.dispatchEvent(new Event('resize'));
    });
}

function saveSidebarWidth(width) {
    chrome.storage.local.set({ sidebarWidth: width });
}

function createDivider() {
    const divider = document.createElement('div');
    divider.id = 'ycl-divider';
    divider.tabIndex = 0;
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'vertical');
    divider.setAttribute('aria-label', msg('dividerLabel', 'Resize columns'));
    divider.title = msg('dividerTitle', 'Drag to resize the columns. Double-click to reset.');

    const currentWidth = () => getFlexy()?.querySelector('#secondary')?.offsetWidth ?? 0;

    divider.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        divider.setPointerCapture(e.pointerId);
        document.documentElement.classList.add('ycl-resizing');
        const startX = e.clientX;
        const startWidth = currentWidth();
        // Suggestions on the right grow when dragging left, and vice versa.
        const sign = settings.swapSides ? 1 : -1;

        const move = (ev) => previewSidebarWidth(startWidth + sign * (ev.clientX - startX));
        const end = () => {
            divider.removeEventListener('pointermove', move);
            divider.removeEventListener('pointerup', end);
            divider.removeEventListener('pointercancel', end);
            document.documentElement.classList.remove('ycl-resizing');
            if (settings.sidebarWidth > 0) saveSidebarWidth(settings.sidebarWidth);
        };
        divider.addEventListener('pointermove', move);
        divider.addEventListener('pointerup', end);
        divider.addEventListener('pointercancel', end);
    });

    divider.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const step = (e.key === 'ArrowLeft' ? 1 : -1) * (settings.swapSides ? -1 : 1) * (e.shiftKey ? 80 : 24);
        previewSidebarWidth(currentWidth() + step);
        saveSidebarWidth(settings.sidebarWidth);
    });

    divider.addEventListener('dblclick', () => saveSidebarWidth(0));
    return divider;
}

function ensureDivider() {
    const columns = getFlexy()?.querySelector('#columns');
    const secondary = columns?.querySelector(':scope > #secondary');
    if (!secondary) return;
    let divider = document.getElementById('ycl-divider');
    if (divider?.parentElement === columns && divider.nextElementSibling === secondary) return;
    divider ??= createDivider();
    columns.insertBefore(divider, secondary);
}

function removeDivider() {
    document.getElementById('ycl-divider')?.remove();
}

/* ---------------------------------------------------------- theater split */

/*
 * In theater split the window still scrolls (to move the wide player away),
 * and each column scrolls on its own below it. Scrolling down inside a column
 * first scrolls the window until the columns reach the top, so the columns
 * get the whole viewport before their own content moves.
 */
function onTheaterWheel(e) {
    if (e.deltaY <= 0 || e.ctrlKey) return;
    if (!(e.target instanceof Element) || !e.target.closest('ytd-watch-flexy #columns')) return;
    const columns = getFlexy()?.querySelector('#columns');
    if (!columns) return;
    const remaining = columns.getBoundingClientRect().top - mastheadHeight();
    if (remaining <= 1) return;
    e.preventDefault();
    const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    window.scrollBy(0, Math.min(e.deltaY * lines, remaining));
}

let theaterWheelOn = false;
function setTheaterWheel(on) {
    if (on === theaterWheelOn) return;
    theaterWheelOn = on;
    if (on) document.addEventListener('wheel', onTheaterWheel, { passive: false });
    else document.removeEventListener('wheel', onTheaterWheel);
}

/* ------------------------------------------------------------------ layout */

function applyLayout() {
    const root = document.documentElement;
    const flexy = getFlexy();
    const watching = settings.enabled && isWatchPage();
    const mode = layoutMode(flexy);

    if (mode === 'split' && !root.classList.contains('ycl-split')) {
        // The window no longer scrolls, so reset any offset carried over from
        // the previous page or theater mode; otherwise the panes would sit
        // partly off-screen.
        window.scrollTo(0, 0);
    }
    root.classList.toggle('ycl-watch', watching);
    root.classList.toggle('ycl-split', mode === 'split');
    root.classList.toggle('ycl-theater-split', mode === 'theater');
    root.classList.toggle('ycl-swap', watching && settings.swapSides);
    root.classList.toggle('ycl-hide-shorts', watching && settings.hideShorts);
    root.classList.toggle('ycl-player-only', settings.dockParts === 'player');
    setTheaterWheel(mode === 'theater');
    applySidebarWidth();

    if (watching) {
        moveCommentsToLeft();
        observeDockParts();
        ensureDivider();
        ensureJumpButton();
    } else if (!settings.enabled) {
        restoreComments();
        removeDivider();
        removeJumpButton();
    }
    connectObserver();
    scheduleDockUpdate();
}

let appliedDockParts = settings.dockParts;

function applySettings() {
    // Switching what docks while docked: undock first so the spacers are
    // rebuilt for the new set of parts.
    if (settings.dockParts !== appliedDockParts && document.documentElement.classList.contains(DOCKED)) {
        setDocked(false, getDockParts());
    }
    appliedDockParts = settings.dockParts;
    applyLayout();
    // Dock/undock now rather than on the next frame so changes are instant.
    updateDock();
    window.dispatchEvent(new Event('resize'));
}

function resetPaneScroll() {
    // New video: start both panes at the top.
    document.querySelectorAll('ytd-watch-flexy #primary, ytd-watch-flexy #secondary')
        .forEach((pane) => { pane.scrollTop = 0; });
}

/*
 * YouTube renders comments lazily and re-renders parts of the page; re-check
 * on DOM changes. The observer runs only while the extension is on, and
 * watches ytd-watch-flexy once it exists rather than the whole document.
 * It also sees the attributes that switch theater, fullscreen and the
 * one/two-column layout.
 */
const LAYOUT_ATTRS = ['theater', 'fullscreen', 'is-two-columns_', 'live-chat-present-and-expanded'];
let observedTarget = null;

const observer = new MutationObserver((records) => {
    if (observedTarget === document.body && getFlexy()) connectObserver();
    if (!isWatchPage()) return;
    if (records.some((r) => r.type === 'attributes' && r.target === getFlexy())) {
        applyLayout();
        return;
    }
    moveCommentsToLeft();
    observeDockParts();
    ensureDivider();
    scheduleDockUpdate();
});

function connectObserver() {
    const target = settings.enabled ? (getFlexy() || document.body) : null;
    if (target === observedTarget) return;
    observer.disconnect();
    observedTarget = target;
    if (target) {
        observer.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: LAYOUT_ATTRS,
        });
    }
}

// Scroll events don't bubble; capture them to see the left pane scrolling.
document.addEventListener('scroll', (e) => {
    if (e.target instanceof Element && e.target.matches('ytd-watch-flexy #primary')) scheduleDockUpdate();
}, { capture: true, passive: true });
window.addEventListener('resize', scheduleDockUpdate);
document.addEventListener('fullscreenchange', applyLayout);

window.addEventListener('yt-navigate-finish', () => {
    applyLayout();
    if (settings.enabled && isWatchPage()) resetPaneScroll();
});

// The popup pings the active tab: no answer from a YouTube tab means it is
// still running a previous version of this script (the browser doesn't
// re-inject content scripts into open tabs when the extension is updated or
// reloaded), so the popup offers to reload it.
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === 'yss-ping') reply({ version: chrome.runtime.getManifest().version });
});

chrome.storage.local.get(YSS_DEFAULTS, (stored) => {
    settings = { ...YSS_DEFAULTS, ...stored };
    applySettings();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;
    for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in YSS_DEFAULTS) {
            settings[key] = newValue ?? YSS_DEFAULTS[key];
            changed = true;
        }
    }
    if (changed) applySettings();
});
