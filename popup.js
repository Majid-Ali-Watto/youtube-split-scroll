// YouTube Split Scroll
// Author: Majid Ali (https://majidev.netlify.app)
// License: MIT

const msg = (key, fallback) => chrome.i18n.getMessage(key) || fallback;

const enabledSwitch = document.getElementById('enabled');
const statusText = document.getElementById('status-text');
const settingsBox = document.getElementById('settings');
const dockOptions = document.getElementById('dock-options');
const threshold = document.getElementById('threshold');
const thresholdValue = document.getElementById('threshold-value');
const widthValue = document.getElementById('width-value');
const inputs = [...document.querySelectorAll('[data-setting]')];

// Localize: data-i18n sets text, data-i18n-aria-label / data-i18n-title set attributes.
for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = msg(el.dataset.i18n, el.textContent);
}
for (const el of document.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', msg(el.dataset.i18nAriaLabel, el.getAttribute('aria-label')));
}
for (const el of document.querySelectorAll('[data-i18n-title]')) {
    el.title = msg(el.dataset.i18nTitle, el.title);
}
document.documentElement.lang = chrome.i18n.getUILanguage();
document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;

function showThreshold(value) {
    thresholdValue.textContent = `${value}%`;
    const { min, max } = threshold;
    threshold.style.setProperty('--fill', `${((value - min) / (max - min)) * 100}%`);
}

function render(s) {
    enabledSwitch.checked = s.enabled;
    document.body.classList.toggle('is-off', !s.enabled);
    statusText.textContent = s.enabled
        ? msg('statusOn', 'On: applies to open YouTube tabs immediately.')
        : msg('statusOff', 'Off: YouTube looks and scrolls as normal.');
    settingsBox.disabled = !s.enabled;

    for (const input of inputs) {
        const value = s[input.dataset.setting];
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else if (input.type === 'radio') input.checked = input.value === value;
        else input.value = String(value);
    }
    dockOptions.hidden = !s.dock;
    showThreshold(s.dockThreshold);
    widthValue.textContent = s.sidebarWidth > 0 ? `${s.sidebarWidth}px` : msg('columnWidthDefault', 'Default');
}

let current = { ...YSS_DEFAULTS };

// Open YouTube tabs listen for storage changes and update immediately.
function save(changes) {
    current = { ...current, ...changes };
    render(current);
    chrome.storage.local.set(changes);
}

enabledSwitch.addEventListener('change', () => save({ enabled: enabledSwitch.checked }));

for (const input of inputs) {
    const key = input.dataset.setting;
    if (input.type === 'range') {
        // Preview while dragging, save on release.
        input.addEventListener('input', () => showThreshold(Number(input.value)));
        input.addEventListener('change', () => save({ [key]: Number(input.value) }));
    } else {
        input.addEventListener('change', () => {
            if (input.type === 'checkbox') save({ [key]: input.checked });
            else if (input.checked) save({ [key]: input.value });
        });
    }
}

document.getElementById('reset-width').addEventListener('click', () => save({ sidebarWidth: 0 }));

// Keyboard shortcut: show the current binding and link to the browser's editor.
chrome.commands.getAll((commands) => {
    const toggle = commands.find((c) => c.name === 'toggle-enabled');
    document.getElementById('shortcut').textContent = toggle?.shortcut || msg('shortcutNone', 'Not set');
});
document.getElementById('change-shortcut').addEventListener('click', () => {
    if (chrome.commands.openShortcutSettings) {
        chrome.commands.openShortcutSettings(); // Firefox
    } else {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); // Chromium browsers
    }
});

// The shortcut can toggle the extension while the popup is open.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in YSS_DEFAULTS) current[key] = newValue ?? YSS_DEFAULTS[key];
    }
    render(current);
});

chrome.storage.local.get(YSS_DEFAULTS, (stored) => {
    current = { ...YSS_DEFAULTS, ...stored };
    render(current);
});

/*
 * After the extension is installed, updated or reloaded, YouTube tabs that
 * were already open keep running the old script (or none at all) until they
 * are reloaded, so settings seem to do nothing there. Ping the active tab and,
 * if it's YouTube and doesn't answer, offer to reload it.
 */
const staleNotice = document.getElementById('stale-tab');

function checkTab(tab) {
    if (!tab?.id || !/^https?:\/\/www\.youtube\.com\//.test(tab.url ?? '')) return;
    chrome.tabs.sendMessage(tab.id, { type: 'yss-ping' }, (reply) => {
        // Reading lastError marks the "no receiver" error as handled.
        const stale = Boolean(chrome.runtime.lastError) || !reply;
        staleNotice.hidden = !stale;
        if (stale) {
            document.getElementById('reload-tab').onclick = () => {
                chrome.tabs.reload(tab.id);
                window.close();
            };
        }
    });
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => checkTab(tab));
