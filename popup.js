// popup.js (Re-architected for Manifest V3 Robustness with Heartbeat)
import { scrapeBumblePage, pasteTextIntoBumbleInput, scrapeTinderPage, pasteTextIntoTinderInput } from './content-scraper.js';

// -- FROM-SCRATCH IMPLEMENTATION OF MISSING HELPERS (v2 - Refined) --
const LINGUISTIC_STYLES = ['auto', 'casual', 'witty', 'playful', 'direct', 'intellectual', 'poetic', 'charming', 'sarcastic', 'sexual', 'mysterious'];
function getToneDescription(v) {
    if (v < 20) return "Friendly & Casual";
    if (v < 50) return "Warm & Engaging";
    if (v < 80) return "Flirty & Playful";
    return "Bold & Daring";
}
function getLengthDescription(v) {
    if (v < 20) return "A few words";
    if (v < 50) return "1-2 sentences";
    if (v < 80) return "A short paragraph";
    return "A long paragraph";
}
function getEmojiInstruction(v) {
    return `Use a ${v} amount of emojis.`;
}
function getStyleDescription(v) {
    const styleMap = {
        'auto': '<strong>Auto:</strong> Adapts to the match’s last message.',
        'casual': '<strong>Casual:</strong> Relaxed, everyday flow.',
        'witty': '<strong>Witty:</strong> Clever wordplay and banter.',
        'playful': '<strong>Playful:</strong> Fun, cheeky vibe.',
        'direct': '<strong>Direct:</strong> Straightforward and confident.',
        'intellectual': '<strong>Intellectual:</strong> Thoughtful and deep.',
        'poetic': '<strong>Poetic:</strong> Vivid and expressive language.',
        'charming': '<strong>Charming:</strong> Polished and charismatic.',
        'sarcastic': '<strong>Sarcastic:</strong> Dry humor and irony.',
        'sexual': '<strong>Sexual:</strong> Bold and evocative.',
        'mysterious': '<strong>Mysterious:</strong> Enigmatic and intriguing.'
    };
    return styleMap[v] || "Select a style.";
}
function determineConversationState(h) {
    if (!h || h.length === 0) return 'OPENER';
    if (h.length < 5) return 'EARLY_CONVO';
    return 'ACTIVE_CONVO';
}
function showNlpModal(initialData, cbs) {
    const overlay = document.getElementById('debug-modal-overlay');
    if (!overlay) return;
    // This function will now be a simple bridge to the debug-modal module's function
    // The actual DOM manipulation will be handled there.
    // We will need to create the debug-modal.js file for this to work.
    if (window.showDebugModal) {
        window.showDebugModal(initialData, cbs);
    } else {
        alert("Debug modal script not loaded.");
    }
}
function hideDebugModal() {
    if(window.hideDebugModal) {
        window.hideDebugModal();
    }
}
// -- END FROM-SCRATCH IMPLEMENTATION --

const DEBUG = {
    log: (category, message, data = null) => console.log(`[WINGMAN-POPUP-${category.toUpperCase()}] ${message}`, data ?? ''),
    error: (category, message, error = null) => console.error(`[WINGMAN-POPUP-${category.toUpperCase()}-ERROR] ${message}`, error ?? ''),
};

const DEFAULTS = {
    nlpUrl: 'http://localhost:8000',
    costPer1kTokens: 0.002,
    flirtyValue: 60,
    lengthValue: 30,
    linguisticStyle: 'auto',
    emojiStrategy: 'no_emoji',
    modelTemperature: 0.5,
    topPValue: 1.0,
    endWithQuestion: false,
    strictGoalOverride: false,
    geoContextToggle: true,
    newTopic: false,
    debugModeEnabled: false,
    userLocationChoice: 'autodetect',
    customInstruction: '',
    lastResponse: '',
    myProfile: `Jay, 35 – 6'0", Vice President at a financial institution, graduate degree from Illinois State University. Driven and grounded, with a strong career focus but a playful side—loves trying new cuisines and cooking for others. Enjoys occasional adventure, meaningful conversations, and believes in making a difference through small actions. Social drinker, non-smoker, exercises sometimes. Prefers genuine connection and meeting in person over endless chatting.`,
    local_llama_url: 'http://localhost:8080/v1/chat/completions',
    local_model_name: 'llama3:latest',
    local_llama_api_key: '',
};

const MATCH_SPECIFIC_SETTINGS_KEYS = [
    'flirtyValue', 'lengthValue', 'linguisticStyle', 'emojiStrategy',
    'endWithQuestion', 'strictGoalOverride', 'geoContextToggle', 'newTopic',
    'customInstruction', 'lastResponse'
];

const EMOJI_STRATEGIES = {
    'auto': 'Auto (Recommended)',
    'friendly': 'Friendly',
    'playful': 'Playful',
    'bold': 'Bold',
    'no_emoji': 'No Emoji'
};
const USER_LOCATIONS = {
    'autodetect': {
        name: 'Auto-Detect Location'
    },
    'charlotte': {
        name: 'Charlotte, NC, USA',
        lat: 35.2271,
        lon: -80.8431,
        timeZone: 'America/New_York',
        country: 'United States'
    },
    'nyc': {
        name: 'New York, NY, USA',
        lat: 40.7128,
        lon: -74.0060,
        timeZone: 'America/New_York',
        country: 'United States'
    },
    'la': {
        name: 'Los Angeles, CA, USA',
        lat: 34.0522,
        lon: -118.2437,
        timeZone: 'America/Los_Angeles',
        country: 'United States'
    },
    'london': {
        name: 'London, UK',
        lat: 51.5072,
        lon: -0.1276,
        timeZone: 'Europe/London',
        country: 'United Kingdom'
    },
    'sydney': {
        name: 'Sydney, Australia',
        lat: -33.8688,
        lon: 151.2093,
        timeZone: 'Australia/Sydney',
        country: 'Australia'
    },
};

const SELECTORS = {
    loadingView: 'loading-view',
    mainView: 'main-view',
    settingsView: 'settings-view',
    errorView: 'error-view',
    errorTitle: 'error-title',
    errorMessage: 'error-message',
    responseArea: 'response-area',
    generateBtn: 'generate-btn',
    copyBtn: 'copy-btn',
    cancelBtn: 'cancel-btn',
    customInstruction: 'custom-instruction',
    clearResponseBtn: 'clear-response-btn',
    clearInstructionBtn: 'clear-instruction-btn',
    flirtySlider: 'flirty-slider',
    flirtyValueLabel: 'flirty-value-label',
    lengthSlider: 'length-slider',
    lengthValueLabel: 'length-value-label',
    emojiStrategySelect: 'emoji-strategy-select',
    conversationStatusDisplay: 'conversation-status-display',
    questionToggleCheckbox: 'question-toggle-checkbox',
    strictGoalToggle: 'strict-goal-toggle',
    geoContextToggle: 'geo-context-toggle',
    newTopicToggle: 'new-topic-toggle',
    settingsBtn: 'settings-btn',
    backBtn: 'back-btn',
    masterResetBtn: 'master-reset-btn',
    resetMatchBtn: 'reset-match-btn',
    temperatureSlider: 'temperature-slider',
    temperatureValueLabel: 'temperature-value-label',
    topPSlider: 'top-p-slider',
    topPValueLabel: 'top-p-value-label',
    linguisticStyleSelect: 'linguistic-style-select',
    debugModeToggle: 'debug-mode-toggle',
    localLlamaUrl: 'localLlamaUrl',
    localLlamaApiKey: 'localLlamaApiKey',
    localModelName: 'localModelName',
    nlpUrl: 'nlpUrl',
    costPer1kTokens: 'costPer1kTokens',
    userLocationSelect: 'user-location-select',
    myProfileSetting: 'my-profile-setting',
    infoTooltip: 'info-tooltip',
    responseTimer: 'response-timer',
    geoContextCard: 'geo-context-card',
    geoUserName: 'geo-user-name',
    geoMatchName: 'geo-match-name',
    userLocation: 'user-location',
    matchLocation: 'match-location',
    userTime: 'user-time',
    matchTime: 'match-time',
    userTimeOfDay: 'user-time-of-day',
    matchTimeOfDay: 'match-time-of-day',
    userTimezone: 'user-timezone',
    matchTimezone: 'match-timezone',
    userCountry: 'user-country',
    matchCountry: 'match-country',
    timeDifference: 'time-difference',
    distanceInfo: 'distance-info',
    dateIdeaBtn: 'date-idea-btn',
    refinementActions: 'refinement-actions',
};

const state = {
    currentMatchUUID: null,
    currentViewId: SELECTORS.loadingView,
    pasterFn: null,
    isRefreshing: false,
    sessionMatchProfile: null,
    sessionScrapedData: null,
    isDirty: false, // New flag for tracking UI changes
    uiOptions: [], // To hold dynamic UI configuration
};

let port;
let tooltipTimeout, timerInterval = null, timerStartTime = 0;
let heartbeatInterval = null;

const getMatchSettingsKey = (uuid) => `matchSettings_${uuid}`;

document.addEventListener('DOMContentLoaded', initializePopup);

// --- Dirty State and Button Logic ---

function addDirtyListeners() {
    const selectors = `#main-view input, #main-view select, #main-view textarea`;
    document.querySelectorAll(selectors).forEach(el => {
        el.addEventListener('input', () => {
            if (!state.isDirty) {
                state.isDirty = true;
                updateMainButtonState();
            }
        });
    });
}

function updateMainButtonState() {
    const button = document.getElementById(SELECTORS.generateBtn);
    if (!button) return;

    // The button will now always say "Generate", as regeneration is the default action.
    button.textContent = 'Generate';
}


function sendMessage(message) {
    if (!port) {
        DEBUG.log('PORT', "Port was disconnected. Attempting to reconnect and send message.");
        setupPort();
        setTimeout(() => {
            if (port) {
                try {
                    port.postMessage(message);
                } catch (e) {
                    DEBUG.error('PORT', "Failed to send message after reconnection attempt.", e);
                    showError("Connection Error", "Could not communicate with the background service. Please try closing and reopening the popup.");
                }
            } else {
                DEBUG.error('PORT', "Port still not connected after reconnection attempt. Message not sent.");
                showError("Connection Error", "Could not communicate with the background service. Please try closing and reopening the popup.");
            }
        }, 100);
    } else {
        try {
            port.postMessage(message);
        } catch (e) {
            DEBUG.error('PORT', "Failed to send message on active port, likely disconnected mid-call.", e);
            port = null;
            sendMessage(message);
        }
    }
}

function setupPort() {
    port = chrome.runtime.connect({
        name: "wingman-popup"
    });

    port.onMessage.addListener((message) => {
        DEBUG.log('PORT', 'Message received from background', message);
        switch (message.action) {
        case 'nlpAnalysisResponse':
            handleNlpAnalysisResponse(message);
            break;
        case 'geoCalculationsResponse':
            handleGeoCalculationsResponse(message);
            break;
        case 'generationUpdate':
            if (message.uuid === state.currentMatchUUID) {
                syncUIWithState(message.state);
            }
            break;
        case 'generationStateResponse':
            syncUIWithState(message.state);
            break;
        }
    });

    port.onDisconnect.addListener(() => {
        DEBUG.log('PORT', 'Port disconnected from popup side.');
        stopHeartbeat();
        port = null;
    });
}

async function initializePopup() {
    setupEventListeners();
    addDirtyListeners(); // Add listeners for UI changes
    setupPort();
    await loadUiOptions(); // Load dynamic UI configuration
    renderDynamicUI(); // Render the dynamic controls
    await loadAndApplySettings();
    await historyManager.render();
    await refreshDataAndUI();
}

async function refreshDataAndUI() {
    if (state.isRefreshing)
        return;

    sendMessage({
        action: "getGenerationState",
        data: {
            uuid: state.currentMatchUUID
        }
    });

    const generationState = await new Promise(resolve => {
        const listener = (msg) => {
            if (msg.action === 'generationStateResponse') {
                if (port)
                    port.onMessage.removeListener(listener);
                resolve(msg.state);
            }
        };
        if (port) {
            port.onMessage.addListener(listener);
        } else {
            resolve({
                isGenerating: false,
                response: null,
                error: null,
                generationId: null,
                generationStartTime: null
            });
        }
    });

    if (generationState.isGenerating) {
        syncUIWithState(generationState);
        return;
    }

    state.isRefreshing = true;
    setUIRefreshingState(true);

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        let scraperFn;

        if (tab.url?.startsWith("https://tinder.com/")) {
            scraperFn = scrapeTinderPage;
            state.pasterFn = pasteTextIntoTinderInput;
        } else if (tab.url?.startsWith("https://bumble.com/")) {
            scraperFn = scrapeBumblePage;
            state.pasterFn = pasteTextIntoBumbleInput;
        } else {
            throw new Error('Unsupported Site: Please navigate to a conversation on Tinder.com or Bumble.com.');
        }

        const results = await chrome.scripting.executeScript({
            target: {
                tabId: tab.id
            },
            function : scraperFn
    });
const pageData = results[0]?.result;
if (!pageData || pageData.error) {
    throw new Error(`Could not read page. ${pageData?.error || 'Please make sure a conversation is selected.'}`);
}

state.sessionScrapedData = pageData;
sendMessage({
    action: "getNlpAnalysis",
    data: {
        scrapedData: pageData
    }
});

} catch (e) {
    showError('Initialization Failed', e.message);
    DEBUG.error('INIT', 'Refresh failed', e);
} finally {
    state.isRefreshing = false;
    setUIRefreshingState(false);
}
}

async function handleNlpAnalysisResponse(message) {
    if (message.error) {
        showError('NLP Analysis Failed', message.error);
        return;
    }

    state.sessionMatchProfile = message.matchProfile;
    state.currentMatchUUID = message.matchProfile.uuid;
    state.isDirty = false; // Reset dirty state after analysis

    await loadAndApplySettings();
    await handleLocationChange();

    displayConversationState();
    showView(SELECTORS.mainView);
    updateMainButtonState(); // Update button text
}

function handleGeoCalculationsResponse(message) {
    if (state.sessionMatchProfile) {
        state.sessionMatchProfile.memory.geoContextData = message.geoContext || null;
    }
    updateGeoContextDisplay(message.geoContext);
}

// Obsolete: The backend now handles prompt generation.
// function handleFinalPayloadResponse(message) { ... }

// --- History and Cost Analysis ---

const historyManager = {
    async get() {
        const data = await chrome.storage.local.get({ responseHistory: [] });
        return data.responseHistory;
    },
    async add(responseText) {
        const history = await this.get();
        history.unshift(responseText);
        if (history.length > 10) history.pop(); // Keep only the last 10
        await chrome.storage.local.set({ responseHistory: history });
        this.render();
    },
    async render() {
        const history = await this.get();
        const container = document.getElementById('history-container');
        const section = document.getElementById('history-section');
        if (!container || !section) return;

        container.innerHTML = '';
        if (history.length === 0) {
            section.hidden = true;
            return;
        }
        section.hidden = false;
        history.forEach(text => {
            const item = document.createElement('div');
            item.className = 'history-item'; // You'll need to add styles for this class
            item.innerHTML = `<div class="history-item-text"></div><div class="history-item-actions"><button class="copy-btn">Copy</button><button class="use-btn">Use</button></div>`;
            item.querySelector('.history-item-text').textContent = text;
            item.querySelector('.copy-btn').addEventListener('click', () => navigator.clipboard.writeText(text));
            item.querySelector('.use-btn').addEventListener('click', () => {
                const responseArea = document.getElementById(SELECTORS.responseArea);
                if(responseArea) responseArea.textContent = text;
            });
            container.appendChild(item);
        });
    }
};

function renderCostAnalysis(tokenCount) {
    const container = document.getElementById('cost-analysis-container');
    const section = document.getElementById('cost-analysis-section');
    const costSetting = state.settings?.costPer1kTokens || DEFAULTS.costPer1kTokens;
    if (!container || !section || tokenCount === undefined || tokenCount === null) {
        if(section) section.hidden = true;
        return;
    }
    const cost = (tokenCount / 1000) * costSetting;
    container.innerHTML = `<p><strong>Tokens:</strong> ${tokenCount} | <strong>Est. Cost:</strong> $${cost.toFixed(5)}</p>`;
    section.hidden = false;
}

// --- Dynamic UI Rendering ---

async function loadUiOptions() {
    const cachedOptions = await chrome.storage.local.get('uiOptions');
    if (cachedOptions.uiOptions && Array.isArray(cachedOptions.uiOptions)) {
        state.uiOptions = cachedOptions.uiOptions;
        DEBUG.log('UI', 'Loaded UI options from cache.');
        return;
    }

    try {
        const settings = await chrome.storage.local.get({ nlpUrl: DEFAULTS.nlpUrl });
        if (!settings.nlpUrl) throw new Error("NLP Service URL is not set.");

        const response = await fetch(`${settings.nlpUrl}/api/v1/options/all`);
        if (!response.ok) throw new Error(`Failed to fetch UI options: ${response.status}`);

        const options = await response.json();
        state.uiOptions = options;
        await chrome.storage.local.set({ uiOptions: options });
        DEBUG.log('UI', 'Fetched and cached UI options from server.');
    } catch (error) {
        showError('UI Load Failed', `Could not load dynamic UI controls. Using fallback. Error: ${error.message}`);
        // In case of failure, we could potentially have hardcoded fallback options here.
        // For now, the UI will just be empty.
    }
}

function renderDynamicUI() {
    const container = document.getElementById('tune-response-controls');
    if (!container) return;

    container.innerHTML = ''; // Clear any existing controls

    const uiControlsGroup = state.uiOptions.find(group => group.groupName === 'UI Controls');

    if (uiControlsGroup && uiControlsGroup.parameters) {
        uiControlsGroup.parameters.forEach(param => {
            const control = createControlElement(param);
            if (control) container.appendChild(control);
        });
    } else {
        DEBUG.error('UI', 'Could not find "UI Controls" group in options from API.');
        container.textContent = 'Could not load UI controls.';
    }

    // Re-attach listeners for the new dynamic elements
    addDirtyListeners();
    // Note: Slider listeners are attached in loadAndApplySettings after values are set.
}

function createControlElement(param) {
    const controlGroup = document.createElement('div');

    let elementHtml = '';
    let labelHtml = '';

    // Use description for the main label text as displayName is not in the API doc
    const mainLabelText = param.description.split('.')[0];

    switch (param.uiType) {
        case 'slider':
            controlGroup.className = 'control-group';
            labelHtml = `<label for="${param.name}" class="label-with-info">
                <span>${mainLabelText}</span>
                <span class="value-label" id="${param.name}-value-label">${param.defaultValue}</span>
            </label>`;
            elementHtml = `<input type="range" id="${param.name}" data-storage-key="${param.name}"
                           min="${param.constraints.min}" max="${param.constraints.max}"
                           step="${param.constraints.step}" value="${param.defaultValue}">`;
            controlGroup.innerHTML = labelHtml + elementHtml;
            break;

        case 'dropdown':
            controlGroup.className = 'control-group stacked';
            labelHtml = `<label for="${param.name}">${mainLabelText}</label>`;
            const optionsHtml = param.constraints.allowedValues.map(opt =>
                `<option value="${opt.value}" ${opt.value === param.defaultValue ? 'selected' : ''}>${opt.description}</option>`
            ).join('');
            elementHtml = `<select id="${param.name}" data-storage-key="${param.name}">${optionsHtml}</select>`;
            controlGroup.innerHTML = labelHtml + elementHtml;
            break;

        case 'checkbox':
            // Checkboxes are handled by the hardcoded "Quick Toggles" for now
            // as they are not part of the "Tune Response" card in the new design.
            // This case is added for future-proofing if their location changes.
            controlGroup.className = 'toggle-switch';
            elementHtml = `<label>
                <input type="checkbox" id="${param.name}" data-storage-key="${param.name}" ${param.defaultValue ? 'checked' : ''}>
                <span>${mainLabelText}</span>
            </label>`;
            controlGroup.innerHTML = elementHtml;
            break;

        default:
            DEBUG.log('UI', `Unknown control uiType received from API: ${param.uiType}`);
            return null; // Don't render unknown control types
    }
    return controlGroup;
}

function startHeartbeat() {
    stopHeartbeat();
    DEBUG.log('HEARTBEAT', 'Starting heartbeat...');
    heartbeatInterval = setInterval(() => {
        sendMessage({
            action: 'heartbeat'
        });
    }, 15000);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        DEBUG.log('HEARTBEAT', 'Stopping heartbeat.');
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function setupEventListeners() {
    window.addEventListener('focus', refreshDataAndUI);
    document.getElementById(SELECTORS.generateBtn)?.addEventListener('click', handleGenerateClick);
    document.getElementById(SELECTORS.copyBtn)?.addEventListener('click', handleCopyClick);
    document.getElementById(SELECTORS.cancelBtn)?.addEventListener('click', handleCancelClick);
    document.getElementById(SELECTORS.settingsBtn)?.addEventListener('click', () => showView(SELECTORS.settingsView));
    document.getElementById(SELECTORS.backBtn)?.addEventListener('click', () => showView(SELECTORS.mainView));
    document.getElementById(SELECTORS.masterResetBtn)?.addEventListener('click', handleMasterReset);
    document.getElementById(SELECTORS.resetMatchBtn)?.addEventListener('click', handleMatchReset);
    document.getElementById(SELECTORS.flirtySlider)?.addEventListener('input', updateSliderLabels);
    document.getElementById(SELECTORS.lengthSlider)?.addEventListener('input', updateSliderLabels);
    document.getElementById(SELECTORS.temperatureSlider)?.addEventListener('input', () => updateSliderValueLabel(SELECTORS.temperatureSlider, SELECTORS.temperatureValueLabel));
    document.getElementById(SELECTORS.topPSlider)?.addEventListener('input', () => updateSliderValueLabel(SELECTORS.topPSlider, SELECTORS.topPValueLabel, 2));
    document.querySelectorAll('.info-icon, [data-tooltip-id]').forEach(icon => {
        icon.addEventListener('mouseenter', handleTooltipShow);
        icon.addEventListener('mouseleave', handleTooltipHide);
    });
    document.getElementById('main-view')?.addEventListener('input', handleSettingChange);
    document.getElementById('main-view')?.addEventListener('change', handleSettingChange);
    document.getElementById('settings-view')?.addEventListener('input', handleSettingChange);
    document.getElementById('settings-view')?.addEventListener('change', handleSettingChange);
    document.getElementById(SELECTORS.userLocationSelect)?.addEventListener('change', handleLocationChange);
    document.getElementById(SELECTORS.clearResponseBtn)?.addEventListener('click', () => {
        const area = document.getElementById(SELECTORS.responseArea);
        area.textContent = '';
        area.dispatchEvent(new Event('input', {
                bubbles: true
            }));
    });
    document.getElementById(SELECTORS.clearInstructionBtn)?.addEventListener('click', () => {
        const area = document.getElementById(SELECTORS.customInstruction);
        area.value = '';
        area.dispatchEvent(new Event('input', {
                bubbles: true
            }));
    });
    document.getElementById(SELECTORS.dateIdeaBtn)?.addEventListener('click', handleDateIdeaClick);
    document.getElementById(SELECTORS.refinementActions)?.addEventListener('click', handleRefinementClick);

    populateSelect(SELECTORS.linguisticStyleSelect, LINGUISTIC_STYLES.map(s => ({
                value: s,
                text: s.charAt(0).toUpperCase() + s.slice(1)
            })));
    populateSelect(SELECTORS.emojiStrategySelect, Object.entries(EMOJI_STRATEGIES).map(([value, text]) => ({
                value,
                text
            })));
    populateSelect(SELECTORS.userLocationSelect, Object.entries(USER_LOCATIONS).map(([key, loc]) => ({
                value: key,
                text: loc.name
            })));
}

async function handleLocationChange() {
    const select = document.getElementById(SELECTORS.userLocationSelect);
    const choice = select.value;
    let messageData = {
        uuid: state.currentMatchUUID
    };
    if (choice === 'autodetect') {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000
                });
            });
            messageData.userCoords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
        } catch (error) {
            showErrorInResponseArea(`Geolocation failed: ${error.message}`);
            updateGeoContextDisplay(null);
            return;
        }
    } else {
        messageData.userLocation = USER_LOCATIONS[choice];
    }
    sendMessage({
        action: "getGeoCalculations",
        data: messageData
    });
}

function updateClearButtonVisibility(inputEl, clearBtnEl) {
    const hasContent = (inputEl.value && inputEl.value.trim() !== '') || (inputEl.textContent && inputEl.textContent.trim() !== '');
    clearBtnEl.classList.toggle('hidden', !hasContent);
}

async function handleSettingChange(event) {
    const el = event.target;
    if (el.id === SELECTORS.customInstruction) {
        updateClearButtonVisibility(el, document.getElementById(SELECTORS.clearInstructionBtn));
    } else if (el.id === SELECTORS.responseArea) {
        updateClearButtonVisibility(el, document.getElementById(SELECTORS.clearResponseBtn));
        document.getElementById(SELECTORS.refinementActions).classList.add('hidden');
    }
    const key = el.dataset.storageKey || (el.id === SELECTORS.responseArea ? 'lastResponse' : null);
    if (!key)
        return;
    const value = el.type === 'checkbox' ? el.checked : (el.id === SELECTORS.responseArea ? el.textContent : el.value);
    if (MATCH_SPECIFIC_SETTINGS_KEYS.includes(key) && state.currentMatchUUID) {
        const storageKey = getMatchSettingsKey(state.currentMatchUUID);
        const result = await chrome.storage.local.get(storageKey);
        const matchSettings = result[storageKey] || {};
        matchSettings[key] = value;
        await chrome.storage.local.set({
            [storageKey]: matchSettings
        });
    } else {
        await chrome.storage.local.set({
            [key]: value
        });
    }
}

async function loadAndApplySettings() {
    const globalKeys = Object.keys(DEFAULTS);
    const globalSettings = {
        ...DEFAULTS,
        ...(await chrome.storage.local.get(globalKeys))
    };
    let matchSpecificSettings = {};
    if (state.currentMatchUUID) {
        const matchKey = getMatchSettingsKey(state.currentMatchUUID);
        const result = await chrome.storage.local.get(matchKey);
        matchSpecificSettings = result[matchKey] || {};
    }
    const finalSettings = {
        ...globalSettings,
        ...matchSpecificSettings
    };
    document.querySelectorAll('[data-storage-key]').forEach(el => {
        const key = el.dataset.storageKey;
        if (finalSettings.hasOwnProperty(key)) {
            const value = finalSettings[key];
            if (el.type === 'checkbox')
                el.checked = value;
            else
                el.value = value;
        }
    });
    const responseArea = document.getElementById(SELECTORS.responseArea);
    if (responseArea && finalSettings.lastResponse) {
        responseArea.textContent = finalSettings.lastResponse;
    }
    updateSliderLabels();
    updateSliderValueLabel(SELECTORS.temperatureSlider, SELECTORS.temperatureValueLabel);
    updateSliderValueLabel(SELECTORS.topPSlider, SELECTORS.topPValueLabel, 2);
    updateClearButtonVisibility(document.getElementById(SELECTORS.customInstruction), document.getElementById(SELECTORS.clearInstructionBtn));
    updateClearButtonVisibility(responseArea, document.getElementById(SELECTORS.clearResponseBtn));
}

async function handleMatchReset() {
    if (!state.currentMatchUUID)
        return;
    const btn = document.getElementById(SELECTORS.resetMatchBtn);
    btn.disabled = true;
    try {
        await chrome.storage.local.remove(getMatchSettingsKey(state.currentMatchUUID));
        document.getElementById(SELECTORS.responseArea).textContent = '';
        await loadAndApplySettings();
    } catch (e) {
        DEBUG.error("RESET", "Failed to reset match settings:", e);
    } finally {
        btn.disabled = false;
    }
}

async function handleMasterReset() {
    const btn = document.getElementById(SELECTORS.masterResetBtn);
    btn.disabled = true;
    try {
        const keysToRemove = Object.keys(DEFAULTS);
        await chrome.storage.local.remove(keysToRemove);
        await loadAndApplySettings();
    } catch (e) {
        DEBUG.error("RESET", "Failed to reset master settings:", e);
    } finally {
        btn.disabled = false;
    }
}

function syncUIWithState(generationState) {
    if (!generationState) return;

    setUIGeneratingState(generationState.isGenerating);
    if (generationState.isGenerating) {
        startHeartbeat();
        if (generationState.generationStartTime) {
            showView(SELECTORS.mainView);
            startTimer(generationState.generationStartTime);
        }
    } else {
        stopHeartbeat();
        stopTimer();
        resetTimerDisplay();
        if (generationState.response) {
            updateUIAfterGeneration({
                reply: generationState.response,
                tokenCount: generationState.tokenCount
            });
            autoType(generationState.response);
        } else if (generationState.error) {
            updateUIAfterGeneration({
                error: generationState.error
            });
        }
    }
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (select)
        select.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('');
}

function updateSliderLabels() {
    const flirtyLabels = {
        0: 'Neutral',
        20: 'Friendly',
        40: 'Warm',
        60: 'Flirty',
        80: 'Very Flirty',
        100: 'Daring'
    };
    const lengthLabels = {
        0: 'Micro',
        20: 'Short',
        40: 'Medium',
        60: 'Long',
        80: 'Epic',
        100: 'Manifesto'
    };
    updateSliderValueLabel(SELECTORS.flirtySlider, SELECTORS.flirtyValueLabel, 0, flirtyLabels);
    updateSliderValueLabel(SELECTORS.lengthSlider, SELECTORS.lengthValueLabel, 0, lengthLabels);
}

function updateSliderValueLabel(sliderId, labelId, precision = 1, labelMap = null) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (slider && label) {
        const value = parseFloat(slider.value);
        label.textContent = labelMap ? (labelMap[Object.keys(labelMap).reverse().find(k => value >= k)] || Object.values(labelMap)[0]) : value.toFixed(precision);
    }
}

function handleTooltipShow(event) {
    clearTimeout(tooltipTimeout);
    const icon = event.currentTarget;
    const tooltipId = icon.dataset.tooltipId;
    const tooltip = document.getElementById(SELECTORS.infoTooltip);
    const content = getTooltipContent(tooltipId);
    if (!content || !tooltip)
        return;
    tooltip.innerHTML = content;
    const iconRect = icon.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    const popupRect = document.querySelector('.app-container').getBoundingClientRect();

    tooltip.style.visibility = 'hidden';
    tooltip.classList.add('visible');

    let left = iconRect.left - bodyRect.left + (iconRect.width / 2) - (tooltip.offsetWidth / 2);

    if (left < 0) {
        left = 5;
    }
    if (left + tooltip.offsetWidth > popupRect.width) {
        left = popupRect.width - tooltip.offsetWidth - 5;
    }

    tooltip.style.top = `${iconRect.bottom - bodyRect.top + 8}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = 'visible';
}

function handleTooltipHide() {
    tooltipTimeout = setTimeout(() => {
        document.getElementById(SELECTORS.infoTooltip)?.classList.remove('visible');
    }, 100);
}

function getTooltipContent(tooltipId) {
    const flirtyValue = Number(document.getElementById(SELECTORS.flirtySlider).value);
    const lengthValue = Number(document.getElementById(SELECTORS.lengthSlider).value);
    const linguisticStyle = document.getElementById(SELECTORS.linguisticStyleSelect).value;
    const styleDescriptions = {
        'auto': '<strong>Auto:</strong> Adapts to the match’s last message.',
        'casual': '<strong>Casual:</strong> Relaxed, everyday flow.',
        'witty': '<strong>Witty:</strong> Clever wordplay and banter.',
        'playful': '<strong>Playful:</strong> Fun, cheeky vibe.',
        'direct': '<strong>Direct:</strong> Straightforward and confident.',
        'intellectual': '<strong>Intellectual:</strong> Thoughtful and deep.',
        'poetic': '<strong>Poetic:</strong> Vivid and expressive language.',
        'charming': '<strong>Charming:</strong> Polished and charismatic.',
        'sarcastic': '<strong>Sarcastic:</strong> Dry humor and irony.',
        'sexual': '<strong>Sexual:</strong> Bold and evocative.',
        'mysterious': '<strong>Mysterious:</strong> Enigmatic and intriguing.'
    };
    const emojiDescriptions = {
        'auto': "<strong>Auto:</strong> " + getEmojiInstruction('auto', flirtyValue, linguisticStyle),
        'friendly': "<strong>Friendly:</strong> " + getEmojiInstruction('friendly', flirtyValue, linguisticStyle),
        'playful': "<strong>Playful:</strong> " + getEmojiInstruction('playful', flirtyValue, linguisticStyle),
        'bold': "<strong>Bold:</strong> " + getEmojiInstruction('bold', flirtyValue, linguisticStyle),
        'no_emoji': "<strong>No Emoji:</strong> No emojis will be used."
    };
    switch (tooltipId) {
    case 'flirt-info':
        return getToneDescription(flirtyValue);
    case 'length-info':
        return getLengthDescription(lengthValue);
    case 'style-info':
        return styleDescriptions[linguisticStyle] || "Select a style.";
    case 'emoji-info':
        return emojiDescriptions[document.getElementById(SELECTORS.emojiStrategySelect).value] || "Select a strategy.";
    case 'start-fresh-info':
        return "<strong>Start Fresh:</strong> Ignores their last message and generates a new opener from their profile.";
    default:
        return null;
    }
}

async function updateGeoContextDisplay(geoContextData) {
    if (!state.sessionMatchProfile || !state.sessionScrapedData)
        return;

    const { myName } = state.sessionScrapedData;
    const { theirName, matchLocation } = state.sessionMatchProfile.metadata;
    const settings = await chrome.storage.local.get('userLocationChoice');
    const userLocationData = USER_LOCATIONS[settings.userLocationChoice || 'autodetect'];
    const card = document.getElementById(SELECTORS.geoContextCard);

    if (card)
        card.hidden = !geoContextData;
    if (!geoContextData)
        return;

    const dataMap = {
        geoUserName: myName || 'User',
        geoMatchName: theirName || 'Match',
        userLocation: userLocationData.name.split(',')[0],
        matchLocation: matchLocation,
        userTimeOfDay: geoContextData.userTimeOfDay,
        matchTimeOfDay: geoContextData.matchTimeOfDay,
        userTimezone: geoContextData.userTimeZoneName || userLocationData.timeZone,
        matchCountry: geoContextData.matchCountry,
        userCountry: geoContextData.userCountry || userLocationData.country,
        timeDifference: geoContextData.timeZoneDifference !== null ? `${geoContextData.timeZoneDifference} hour(s)` : 'N/A',
        distanceInfo: `${geoContextData.distance.miles} miles / ${geoContextData.distance.km} km`,
        countryDifference: `${geoContextData.countryDifference}`
    };

    Object.entries(dataMap).forEach(([id, text]) => {
        const el = document.getElementById(SELECTORS[id]);
        if (el)
            el.textContent = text || 'N/A';
    });
}

function startTimer(startTime) {
    stopTimer();
    if (!startTime)
        return;
    timerStartTime = startTime;
    const timerEl = document.getElementById(SELECTORS.responseTimer);
    if (timerEl) {
        updateTimerDisplay();
        timerInterval = setInterval(updateTimerDisplay, 1000);
    }
}

function stopTimer() {
    if (timerInterval)
        clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimerDisplay() {
    const timerEl = document.getElementById(SELECTORS.responseTimer);
    if (timerEl && timerStartTime > 0) {
        const elapsedSeconds = Math.floor((Date.now() - timerStartTime) / 1000);
        timerEl.textContent = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
    }
}

function resetTimerDisplay() {
    const timerEl = document.getElementById(SELECTORS.responseTimer);
    if (timerEl) {
        timerEl.textContent = '00:00';
    }
    timerStartTime = 0;
}

async function handleGenerateClick() {
    const button = document.getElementById(SELECTORS.generateBtn);
    if (!button || button.disabled) return;

    if (!state.sessionMatchProfile || !state.currentMatchUUID || !state.sessionScrapedData) {
        showErrorInResponseArea("Error: Core data not loaded. Please try refreshing.");
        return;
    }

    // This function now exclusively handles regeneration.
    // The initial generation is triggered automatically by the backend after /analyze.
    const uiSettings = gatherUiSettings();

    // The debug mode logic might need to be re-evaluated, but for now, we'll
    // bypass it and use the main regeneration flow.
    if (document.getElementById(SELECTORS.debugModeToggle).checked) {
        alert("Debug mode needs to be updated for the new regeneration flow.");
        return;
    }

    setUIGeneratingState(true);
    startTimer(Date.now());

    sendMessage({
        action: "regeneratePrompts",
        data: {
            matchId: state.currentMatchUUID,
            scrapedData: state.sessionScrapedData,
            uiSettings: uiSettings
        }
    });
}

function gatherUiSettings() {
    const settings = {};
    // Gather settings from dynamically created controls
    document.querySelectorAll('#tune-response-controls [data-storage-key]').forEach(el => {
        const key = el.dataset.storageKey;
        if (el.type === 'checkbox') {
            settings[key] = el.checked;
        } else if (el.type === 'range' || el.type === 'number') {
            settings[key] = Number(el.value);
        } else {
            settings[key] = el.value;
        }
    });
    // Gather settings from the hardcoded "quick toggles"
    document.querySelectorAll('.quick-toggles [data-storage-key]').forEach(el => {
        const key = el.dataset.storageKey;
        settings[key] = el.checked;
    });
    // Add custom instruction
    settings.customInstruction = document.getElementById(SELECTORS.customInstruction).value.trim();

    return settings;
}

function handleCancelClick() {
    if (state.currentMatchUUID) {
        sendMessage({
            action: "cancelGeneration",
            data: {
                uuid: state.currentMatchUUID
            }
        });
    }
}

function handleCopyClick() {
    const responseArea = document.getElementById(SELECTORS.responseArea);
    const copyBtn = document.getElementById(SELECTORS.copyBtn);
    if (!responseArea || !copyBtn || !responseArea.textContent)
        return;
    navigator.clipboard.writeText(responseArea.textContent).then(() => {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
        }, 1500);
    });
}

async function autoType(text) {
    if (!state.pasterFn)
        return;
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        if (tab?.id) {
            chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                function : state.pasterFn,
                args: [text]
        });
    }
} catch (error) {
    DEBUG.error('AUTOTYPE', 'Failed to auto-type', error);
}
}

function setUIRefreshingState(isRefreshing) {
    const generateBtn = document.getElementById(SELECTORS.generateBtn);
    if (generateBtn) {
        generateBtn.disabled = isRefreshing;
        if (isRefreshing)
            generateBtn.innerHTML = 'Refreshing...';
        else
            generateBtn.innerHTML = 'Generate';
    }
    if (isRefreshing)
        showView(SELECTORS.loadingView);
}

function setUIGeneratingState(isGenerating) {
    const generateBtn = document.getElementById(SELECTORS.generateBtn);
    const cancelBtn = document.getElementById(SELECTORS.cancelBtn);
    const copyBtn = document.getElementById(SELECTORS.copyBtn);
    const responseArea = document.getElementById(SELECTORS.responseArea);
    const refinementActions = document.getElementById(SELECTORS.refinementActions);
    const dateIdeaBtn = document.getElementById(SELECTORS.dateIdeaBtn);

    if (!generateBtn || !cancelBtn || !copyBtn || !responseArea || !refinementActions || !dateIdeaBtn)
        return;

    generateBtn.disabled = isGenerating;
    dateIdeaBtn.disabled = isGenerating;
    document.querySelectorAll('.btn-refine').forEach(btn => btn.disabled = isGenerating);

    generateBtn.innerHTML = isGenerating ? 'Thinking...' : 'Generate';
    cancelBtn.classList.toggle('hidden', !isGenerating);
    copyBtn.classList.toggle('hidden', isGenerating);
    refinementActions.classList.add('hidden');

    if (isGenerating) {
        responseArea.textContent = '';
        responseArea.dispatchEvent(new Event('input', {
                bubbles: true
            }));
        responseArea.classList.add('loading');
        responseArea.classList.remove('error');
    } else {
        dateIdeaBtn.disabled = false;
        dateIdeaBtn.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"></path></svg> Suggest a Date Idea`;
        responseArea.classList.remove('loading');
        if (!responseArea.textContent || responseArea.classList.contains('error')) {
            copyBtn.classList.add('hidden');
        }
    }
}

function updateUIAfterGeneration(result) {
    const responseArea = document.getElementById(SELECTORS.responseArea);
    const copyBtn = document.getElementById(SELECTORS.copyBtn);
    const refinementActions = document.getElementById(SELECTORS.refinementActions);

    if (!responseArea || !copyBtn || !refinementActions)
        return;

    if (result?.reply) {
        const cleanReply = result.reply.trim().replace(/^["']|["']$/g, '');
        responseArea.textContent = cleanReply;
        responseArea.dispatchEvent(new Event('input', {
                bubbles: true
            }));
        responseArea.classList.remove('error');
        copyBtn.classList.remove('hidden');
        refinementActions.classList.remove('hidden');
        handleCopyClick();

        historyManager.add(cleanReply);
        if (result.tokenCount) {
            renderCostAnalysis(result.tokenCount);
        }

    } else {
        showErrorInResponseArea(result?.error || 'Failed to get a response.');
        copyBtn.classList.add('hidden');
        refinementActions.classList.add('hidden');
    }
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const view = document.getElementById(viewId);
    if (view)
        view.classList.remove('hidden');
    state.currentViewId = viewId;
}

function showError(title, message) {
    const titleEl = document.getElementById(SELECTORS.errorTitle);
    const messageEl = document.getElementById(SELECTORS.errorMessage);
    if (titleEl)
        titleEl.textContent = title;
    if (messageEl)
        messageEl.textContent = message;
    showView(SELECTORS.errorView);
}

function showErrorInResponseArea(message) {
    const responseArea = document.getElementById(SELECTORS.responseArea);
    if (responseArea) {
        responseArea.textContent = `Error: ${message}`;
        responseArea.dispatchEvent(new Event('input', {
                bubbles: true
            }));
        responseArea.classList.add('error');
    }
}

function displayConversationState() {
    if (!state.sessionMatchProfile?.analysis)
        return;
    const analysis = state.sessionMatchProfile.analysis;
    const convoState = analysis.conversationState;
    const dateArcPhase = analysis.memory.dateArcPhase;

    const stateDisplayMap = {
        'OPENER': 'Status: New Conversation (Opener)',
        'EARLY_CONVO': 'Status: Early Conversation',
        'ACTIVE_CONVO': 'Status: Active Conversation',
        'REENGAGING_DAY': 'Status: Re-engaging (1-7 day pause)',
        'REENGAGING_WEEK': 'Status: Re-engaging (1-4 week pause)',
        'REENGAGING_MONTH': 'Status: Re-engaging (1+ month pause)'
    };
    const statusEl = document.getElementById(SELECTORS.conversationStatusDisplay);
    if (statusEl)
        statusEl.textContent = stateDisplayMap[convoState] || 'Status: Unknown';

    const dateIdeaBtn = document.getElementById(SELECTORS.dateIdeaBtn);
    if (dateIdeaBtn) {
        const showButton = dateArcPhase === 'escalation' || dateArcPhase === 'planning';
        dateIdeaBtn.classList.toggle('hidden', !showButton);
    }
}

function handleDateIdeaClick() {
    if (!state.sessionMatchProfile || !state.currentMatchUUID) {
        showErrorInResponseArea("Error: Match profile data not loaded. Please refresh.");
        return;
    }
    setUIGeneratingState(true);
    startTimer(Date.now());

    sendMessage({
        action: 'getAIDateIdea',
        data: {
            uuid: state.currentMatchUUID,
            generationId: Date.now()
        }
    });
}

function handleRefinementClick(event) {
    const btn = event.target.closest('.btn-refine');
    if (!btn)
        return;

    const refinementType = btn.dataset.refineType;
    const responseArea = document.getElementById(SELECTORS.responseArea);
    const originalResponse = responseArea.textContent;

    if (!refinementType || !originalResponse)
        return;

    setUIGeneratingState(true);
    startTimer(Date.now());

    sendMessage({
        action: 'refineAIResponse',
        data: {
            uuid: state.currentMatchUUID,
            originalResponse,
            refinementType,
            generationId: Date.now()
        }
    });
}
