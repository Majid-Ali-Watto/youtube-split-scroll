// YouTube Split Scroll
// Author: Majid Ali (https://majidev.netlify.app)
// License: MIT

/*
 * Background worker (service worker in Chromium, event page in Firefox):
 * - shows a grey toolbar icon with an "OFF" badge while the extension is disabled;
 * - handles the keyboard shortcut that toggles it on/off.
 */

const msg = (key, fallback) => chrome.i18n.getMessage(key) || fallback;

const ICON_ON = { 16: 'icons/icon16.png', 32: 'icons/icon32.png' };
const ICON_OFF = { 16: 'icons/icon-off16.png', 32: 'icons/icon-off32.png' };

function showState(enabled) {
    chrome.action.setIcon({ path: enabled ? ICON_ON : ICON_OFF });
    chrome.action.setBadgeText({ text: enabled ? '' : msg('badgeOff', 'OFF') });
    chrome.action.setBadgeBackgroundColor({ color: '#c0392b' });
    chrome.action.setBadgeTextColor?.({ color: '#ffffff' });
    chrome.action.setTitle({
        title: `${msg('extName', 'YouTube Split Scroll')}: ${enabled ? msg('stateOn', 'On') : msg('stateOff', 'Off')}`,
    });
}

function refresh() {
    chrome.storage.local.get({ enabled: true }, (stored) => showState(stored.enabled !== false));
}

chrome.runtime.onInstalled.addListener(refresh);
chrome.runtime.onStartup.addListener(refresh);

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) showState(changes.enabled.newValue !== false);
});

chrome.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-enabled') return;
    chrome.storage.local.get({ enabled: true }, (stored) => {
        // Open YouTube tabs, the popup and the badge all follow this change.
        chrome.storage.local.set({ enabled: stored.enabled === false });
    });
});
