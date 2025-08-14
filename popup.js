// --- Global State ---
let state = { prompts: null, settings: {}, uiOptions: [], scrapedData: null, matchId: null, isDirty: false };
const debugModalState = { isRendered: false, currentPage: 0, totalPages: 0, pages: [] };

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    state.settings = await settingsManager.get();
    await loadUiOptions();
    if (state.uiOptions.length === 0) return;
    renderDynamicUI(state.uiOptions);
    initEventListeners();
    addDirtyListeners();
    updateMainButtonState();
    initSettingsPanel(state.settings);
    // ... rest of the logic
});

// ... other functions

// --- Event Listeners & Handlers ---
function initEventListeners() {
    document.getElementById('main-action-button').addEventListener('click', handleMainActionClick);
    document.getElementById('reset-button').addEventListener('click', handleResetClick);
    // ... other listeners
}

function handleMainActionClick() {
    const button = document.getElementById('main-action-button');
    if (button.textContent === 'Re-Analyze') {
        if (document.getElementById('debug-checkbox').checked) {
            const modal = document.getElementById('debug-modal');
            if (!debugModalState.isRendered) {
                renderDebugModal(state.uiOptions);
                debugModalState.isRendered = true;
            }
            modal.style.display = 'flex';
            navigateDebugModal(0);
        } else {
            handleRegenerateClick();
        }
    } else {
        handleGenerateClick();
    }
}

function handleResetClick() {
    // Re-render dynamic controls to reset them to their default values
    renderDynamicUI(state.uiOptions);

    // Reset static controls to their assumed defaults
    document.getElementById('custom-instructions').value = '';
    document.getElementById('end-with-question').checked = true;
    document.getElementById('start-fresh').checked = false;
    document.getElementById('strict-goal').checked = false;
    document.getElementById('override-geo').checked = false;

    // Re-add listeners to new dynamic elements
    addDirtyListeners();

    // Reset dirty state and update button
    state.isDirty = false;
    updateMainButtonState();
}

function updateMainButtonState() {
    const button = document.getElementById('main-action-button');
    const isDirty = state.isDirty || document.getElementById('debug-checkbox').checked;
    button.textContent = isDirty ? 'Re-Analyze' : 'Generate';
}

function addDirtyListeners() {
    const selectors = '.dynamic-panel input, .dynamic-panel select, .dynamic-panel textarea, #custom-instructions, #end-with-question, #debug-checkbox';
    document.querySelectorAll(selectors).forEach(el => {
        el.addEventListener('input', () => {
            if (!state.isDirty) {
                state.isDirty = true;
                updateMainButtonState();
            }
        });
    });
}

// ... other handlers

// The rest of the file remains the same...
async function scrapeAndAnalyze(uiSettings = {}, tab) {
    // ...
}
