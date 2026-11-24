// YouTube Split Scroll
// Author: Majid Ali (https://majidev.netlify.app)
// License: MIT

/*
 * Settings shared by the content script and the popup, stored in
 * chrome.storage.local. Missing keys fall back to these defaults.
 */
const YSS_DEFAULTS = Object.freeze({
    enabled: true,         // master on/off switch
    dock: true,            // dock the player into the right column when scrolled away
    dockThreshold: 90,     // % of the player scrolled out of view before it docks
    dockParts: 'all',      // 'all' = player + title + actions row, 'player' = player only
    jumpButtons: true,     // floating "Comments" / "Back to video" button in the left pane
    swapSides: false,      // suggestions on the left, video + comments on the right
    hideShorts: false,     // hide Shorts in the suggestions
    theaterSplit: false,   // independent column scrolling below the player in theater mode
    sidebarWidth: 0,       // suggestions column width in px; 0 = YouTube's default
});

const YSS_LIMITS = Object.freeze({
    dockThresholdMin: 50,
    dockThresholdMax: 100,
    sidebarMin: 300,       // narrowest suggestions column
    primaryMin: 480,       // narrowest video + comments column
});
