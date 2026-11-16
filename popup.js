const enableBtn = document.getElementById('enable');
const disableBtn = document.getElementById('disable');
const status = document.getElementById('status');

function render(enabled) {
    enableBtn.setAttribute('aria-pressed', String(enabled));
    disableBtn.setAttribute('aria-pressed', String(!enabled));
    status.textContent = enabled
        ? 'On: applies to open YouTube tabs immediately.'
        : 'Off: YouTube looks and scrolls as normal.';
}

function setEnabled(enabled) {
    render(enabled);
    // Open YouTube tabs listen for this change and update immediately.
    chrome.storage.local.set({ enabled });
}

enableBtn.addEventListener('click', () => setEnabled(true));
disableBtn.addEventListener('click', () => setEnabled(false));

chrome.storage.local.get({ enabled: true }, (stored) => render(stored.enabled));
