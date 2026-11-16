// YouTube Split Scroll
// Author: Majid Ali (https://majidev.netlify.app)
// License: MIT

/*
 * On/off switch, set from the toolbar popup and stored in chrome.storage.local.
 * Starts off until the stored value has been read, then applyEnabled() sets the
 * real state; changes from the popup apply immediately (see onChanged below).
 */
let enabled = false;

function isWatchPage() {
    return location.pathname === '/watch';
}

// Where each moved #comments element lived, so turning the extension off can
// put it back exactly where YouTube had it.
const commentsHome = new WeakMap();

function moveCommentsToLeft() {
    const watchFlexy = document.querySelector('ytd-watch-flexy');
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

/*
 * Docking: once 90% of the player is scrolled out of the left pane, the
 * player, the video title and the channel/subscribe/like row are pinned
 * (position: fixed, see styles.css) as a stack over the top of the right
 * column, matching its width. Their original boxes stay in the left pane as
 * fixed-height spacers so the left scroll position — and thus this dock
 * condition — doesn't jump when they leave the flow.
 */
const DOCKED = 'ycl-docked';
let spacerRatio = 0; // undocked player height / width, captured at dock time

function isDefaultTwoColumn(flexy) {
    return flexy.hasAttribute('is-two-columns_')
        && !flexy.hasAttribute('theater')
        && !flexy.hasAttribute('fullscreen');
}

function getDockParts() {
    const flexy = document.querySelector('ytd-watch-flexy');
    return {
        flexy,
        primary: flexy?.querySelector('#primary'),
        secondary: flexy?.querySelector('#secondary'),
        player: flexy?.querySelector('#primary #player'),
        playerBox: flexy?.querySelector('#primary #player-container-outer'),
        title: flexy?.querySelector('#primary ytd-watch-metadata #title'),
        topRow: flexy?.querySelector('#primary ytd-watch-metadata #top-row'),
    };
}

// Stack offsets for the docked parts; the right column shrinks by their total
// so suggestions scroll below them. Heights follow the docked width.
function syncDockHeights() {
    const root = document.documentElement;
    const docked = root.classList.contains(DOCKED);
    const { playerBox, title, topRow } = getDockParts();
    const h = (el) => `${docked && el ? el.offsetHeight : 0}px`;
    root.style.setProperty('--ycl-player-h', h(playerBox));
    root.style.setProperty('--ycl-title-h', h(title));
    root.style.setProperty('--ycl-toprow-h', h(topRow));
}

function updateDock() {
    const root = document.documentElement;
    const { flexy, primary, secondary, player, title, topRow } = getDockParts();
    const info = title?.parentElement;
    const wasDocked = root.classList.contains(DOCKED);
    // While docked, #player is the spacer holding the player's original box.
    const playerRect = player?.getBoundingClientRect();

    const shouldDock = Boolean(
        enabled && isWatchPage() && flexy && secondary && player
        && isDefaultTwoColumn(flexy)
        // An unrendered player reports a zero rect; never dock on that.
        && playerRect.height > 0
        // Dock once at least 90% of the player is scrolled above the pane.
        && playerRect.top + playerRect.height * 0.9 <= primary.getBoundingClientRect().top
    );

    if (shouldDock) {
        if (!wasDocked) spacerRatio = player.offsetHeight / player.offsetWidth;
        player.style.height = `${player.offsetWidth * spacerRatio}px`;

        const target = (secondary.querySelector('#secondary-inner') || secondary).getBoundingClientRect();
        root.style.setProperty('--ycl-dock-top', `${primary.getBoundingClientRect().top}px`);
        root.style.setProperty('--ycl-dock-left', `${target.left}px`);
        root.style.setProperty('--ycl-dock-width', `${target.width}px`);
    } else if (wasDocked) {
        if (player) player.style.height = '';
        if (info) info.style.paddingTop = '';
    }

    if (shouldDock !== wasDocked) {
        const infoHeightBefore = info?.offsetHeight ?? 0;
        root.classList.toggle(DOCKED, shouldDock);
        // Keep the space the title and top row occupied in the left pane.
        if (shouldDock && info) info.style.paddingTop = `${infoHeightBefore - info.offsetHeight}px`;
        syncDockHeights();
        // Let YouTube's player recompute its video size for the new box.
        window.dispatchEvent(new Event('resize'));
    }
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

function applyLayout() {
    const watching = enabled && isWatchPage();
    const root = document.documentElement;

    if (watching && !root.classList.contains('ycl-watch')) {
        // The window no longer scrolls, so reset any offset carried over from
        // the previous page; otherwise the panes would sit partly off-screen.
        window.scrollTo(0, 0);
    }
    root.classList.toggle('ycl-watch', watching);

    if (watching) {
        moveCommentsToLeft();
        observeDockParts();
    } else if (!enabled) {
        restoreComments();
    }
    scheduleDockUpdate();
}

function applyEnabled(value) {
    if (enabled === value) return;
    enabled = value;
    applyLayout();
    // Undock/dock now rather than on the next frame so the switch is instant.
    updateDock();
    window.dispatchEvent(new Event('resize'));
}

function resetPaneScroll() {
    // New video: start both panes at the top.
    document.querySelectorAll('ytd-watch-flexy #primary, ytd-watch-flexy #secondary')
        .forEach((pane) => { pane.scrollTop = 0; });
}

// YouTube renders comments lazily; re-check whenever the DOM changes.
const observer = new MutationObserver(() => {
    if (enabled && isWatchPage()) {
        moveCommentsToLeft();
        observeDockParts();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Scroll events don't bubble; capture them to see the left pane scrolling.
document.addEventListener('scroll', (e) => {
    if (e.target instanceof Element && e.target.matches('ytd-watch-flexy #primary')) scheduleDockUpdate();
}, { capture: true, passive: true });
window.addEventListener('resize', scheduleDockUpdate);
document.addEventListener('fullscreenchange', scheduleDockUpdate);

window.addEventListener('yt-navigate-finish', () => {
    applyLayout();
    if (enabled && isWatchPage()) resetPaneScroll();
});

chrome.storage.local.get({ enabled: true }, (stored) => applyEnabled(stored.enabled));
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) applyEnabled(changes.enabled.newValue !== false);
});
