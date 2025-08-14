// popup.js (Re-architected for Manifest V3 Robustness with Heartbeat)
import { scrapeBumblePage, pasteTextIntoBumbleInput, scrapeTinderPage, pasteTextIntoTinderInput } from './content-scraper.js';
import { getToneDescription, getLengthDescription, getEmojiInstruction, getStyleDescription, LINGUISTIC_STYLES } from './uiHelpers.js';
import { UI_CONFIG, DEFAULTS } from './uiConfig.js';
import { showNlpModal, hideDebugModal, regeneratePrompts } from './debug-modal.js';

const DEBUG = {
    log: (category, message, data = null) => console.log(`[WINGMAN-POPUP-${category.toUpperCase()}] ${message}`, data ?? ''),
    error: (category, message, error = null) => console.error(`[WINGMAN-POPUP-${category.toUpperCase()}-ERROR] ${message}`, error ?? ''),
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
    dateArcPhaseDisplay: 'date-arc-phase-display',
    sexualTensionDisplay: 'sexual-tension-display',
    suggestedActionDisplay: 'suggested-action-display',
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
    nlpUrl: 'nlpUrl',
    localLlamaUrl: 'localLlamaUrl',
    localLlamaApiKey: 'localLlamaApiKey',
    localModelName: 'localModelName',
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
};

let port;
let tooltipTimeout, timerInterval = null, timerStartTime = 0;
let heartbeatInterval = null;

const getMatchSettingsKey = (uuid) => `matchSettings_${uuid}`;

document.addEventListener('DOMContentLoaded', initializePopup);

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
        case 'finalPayloadResponse':
            handleFinalPayloadResponse(message);
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
    setupPort();
    await loadAndApplySettings();
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

    await loadAndApplySettings();

    // The geoContext is now part of the main analysis payload
    if (state.sessionMatchProfile?.analysis?.geoContext) {
        updateGeoContextDisplay(state.sessionMatchProfile.analysis.geoContext);
    } else {
        updateGeoContextDisplay(null); // Hide the card if no data
    }

    displayConversationState();
    showView(SELECTORS.mainView);
}

function handleGeoCalculationsResponse(message) {
    // This is now deprecated and handled by the main NLP analysis response.
    // Kept here to prevent errors if the background script sends an old message.
    DEBUG.log('DEPRECATED', 'handleGeoCalculationsResponse called', message);
}

function handleFinalPayloadResponse(message) {
    if (message.error) {
        showErrorInResponseArea(message.error);
        setUIGeneratingState(false);
        return;
    }
    sendMessage({
        action: "getAIResponse",
        data: {
            payload: message.payload,
            generationId: Date.now(),
            uuid: state.currentMatchUUID,
            logData: message.logData
        }
    });
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
    // Main buttons
    document.getElementById(SELECTORS.generateBtn)?.addEventListener('click', handleGenerateClick);
    document.getElementById(SELECTORS.copyBtn)?.addEventListener('click', handleCopyClick);
    document.getElementById(SELECTORS.cancelBtn)?.addEventListener('click', handleCancelClick);
    document.getElementById(SELECTORS.settingsBtn)?.addEventListener('click', () => showView(SELECTORS.settingsView));
    document.getElementById(SELECTORS.backBtn)?.addEventListener('click', () => showView(SELECTORS.mainView));
    document.getElementById(SELECTORS.masterResetBtn)?.addEventListener('click', handleMasterReset);
    document.getElementById(SELECTORS.resetMatchBtn)?.addEventListener('click', handleMatchReset);
    document.getElementById(SELECTORS.dateIdeaBtn)?.addEventListener('click', handleDateIdeaClick);
    document.getElementById(SELECTORS.refinementActions)?.addEventListener('click', handleRefinementClick);

    // Tooltips
    document.querySelectorAll('.info-icon, [data-tooltip-id]').forEach(icon => {
        icon.addEventListener('mouseenter', handleTooltipShow);
        icon.addEventListener('mouseleave', handleTooltipHide);
    });

    // Data-driven event listeners from UI_CONFIG
    for (const key in UI_CONFIG) {
        const config = UI_CONFIG[key];
        const el = document.getElementById(config.id);
        if (el) {
            const eventType = (config.type === 'slider' || config.type === 'text') ? 'input' : 'change';
            el.addEventListener(eventType, handleSettingChange);

            if (config.type === 'slider') {
                el.addEventListener('input', () => updateSliderValueLabel(config.id, `${config.id}-value`));
            }
        }
    }

    // Manual event listeners for elements not in UI_CONFIG
    document.getElementById(SELECTORS.clearResponseBtn)?.addEventListener('click', () => {
        const area = document.getElementById(SELECTORS.responseArea);
        area.textContent = '';
        area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.getElementById(SELECTORS.clearInstructionBtn)?.addEventListener('click', () => {
        const area = document.getElementById(SELECTORS.customInstruction);
        area.value = '';
        area.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Populate selects
    populateSelect(UI_CONFIG.linguisticStyleSelect.id, Object.values(UI_CONFIG.linguisticStyleSelect.options).map(s => ({ value: s, text: s.charAt(0).toUpperCase() + s.slice(1) })));
    populateSelect(UI_CONFIG.emojiStrategySelect.id, Object.entries(UI_CONFIG.emojiStrategySelect.options).map(([value, text]) => ({ value, text })));
    populateSelect(SELECTORS.userLocationSelect, Object.entries(USER_LOCATIONS).map(([key, loc]) => ({ value: key, text: loc.name })));

    // Add listeners for dynamic prompt updates in debug modal
    const controlsToWatch = [
        'custom-instruction', 'flirty-slider', 'length-slider',
        'linguistic-style-select', 'emoji-strategy-select', 'temperature-slider',
        'top-p-slider', 'question-toggle-checkbox', 'strict-goal-toggle',
        'new-topic-toggle', 'geo-context-toggle'
    ];

    controlsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = (el.type === 'range' || el.type === 'textarea') ? 'input' : 'change';
            el.addEventListener(eventType, regeneratePrompts);
        }
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
    const allStorage = await chrome.storage.local.get(null);
    const globalSettings = {};
    const allDefaultKeys = Object.keys(DEFAULTS);

    for (const key of allDefaultKeys) {
        if (allStorage[key] !== undefined) {
            globalSettings[key] = allStorage[key];
        }
    }

    let matchSettings = {};
    if (state.currentMatchUUID) {
        const matchKey = getMatchSettingsKey(state.currentMatchUUID);
        matchSettings = allStorage[matchKey] || {};
    }

    const finalSettings = {
        ...DEFAULTS,
        ...globalSettings,
        ...matchSettings
    };

    for (const config of Object.values(UI_CONFIG)) {
        const el = document.getElementById(config.id);
        if (el) {
            const value = finalSettings[config.storageKey];
            if (config.type === 'checkbox') {
                el.checked = value;
            } else if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                el.value = value;
            } else if (el.isContentEditable) {
                el.textContent = value;
            }
        }
    }
    updateSliderLabels();
    updateSliderValueLabel(SELECTORS.temperatureSlider, SELECTORS.temperatureValueLabel);
    updateSliderValueLabel(SELECTORS.topPSlider, SELECTORS.topPValueLabel, 2);
    updateClearButtonVisibility(document.getElementById(SELECTORS.customInstruction), document.getElementById(SELECTORS.clearInstructionBtn));
    updateClearButtonVisibility(document.getElementById(SELECTORS.responseArea), document.getElementById(SELECTORS.clearResponseBtn));
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
        await chrome.storage.local.clear();
        state.sessionMatchProfile = null; // Clear the in-memory profile
        await loadAndApplySettings();
        // Also refresh the UI to reflect the reset geo-data
        await handleLocationChange();
        displayConversationState(); // This will clear the state display
    } catch (e) {
        DEBUG.error("RESET", "Failed to perform master reset:", e);
    } finally {
        btn.disabled = false;
    }
}

function syncUIWithState(generationState) {
    if (!generationState)
        return;
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
                reply: generationState.response
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
    if (!state.sessionMatchProfile || !state.currentMatchUUID || !state.sessionMatchProfile.analysis) {
        showErrorInResponseArea("Error: Conversation analysis is not complete. Please wait a moment and try again.");
        if (!state.isRefreshing) {
            refreshDataAndUI();
        }
        return;
    }

    const dataForBackground = await gatherCoreDataForGeneration();
    if (document.getElementById(SELECTORS.debugModeToggle).checked) {
        const fullGenerationData = {
            ...state.sessionScrapedData,
            ...state.sessionMatchProfile.metadata,
            myProfile: dataForBackground.myProfile,
            conversationHistory: state.sessionMatchProfile.conversationHistory,
            conversationAnalysis: state.sessionMatchProfile.analysis,
            geoContextData: state.sessionMatchProfile.memory.geoContextData,
            forceIncludeGeoContext: dataForBackground.forceIncludeGeoContext,
            taskInstructions: dataForBackground.taskInstructions,
        };
        const debugCallbacks = {
            sendFinalPayloadToAI: (payload) => {
                sendMessage({
                    action: "getAIResponse",
                    data: {
                        payload,
                        generationId: Date.now(),
                        uuid: state.currentMatchUUID,
                        logData: {
                            uuid: state.currentMatchUUID,
                            analysis: state.sessionMatchProfile.analysis,
                            payload: payload
                        }
                    }
                });
            },
            setUIGeneratingState,
            showErrorInResponseArea,
            hideDebugModal,
            startTimer,
            stopTimer,
            resetTimerDisplay
        };
        showNlpModal(fullGenerationData, debugCallbacks);
    } else {
        sendMessage({
            action: "getFinalPayload",
            data: dataForBackground
        });
    }
}

async function gatherCoreDataForGeneration() {
    const settings = await chrome.storage.local.get('myProfile');
    const myProfile = settings.myProfile || DEFAULTS.myProfile;
    const myName = state.sessionScrapedData?.myName || DEFAULTS.myProfile.split(',')[0].trim();
    const theirName = state.sessionMatchProfile?.metadata?.theirName || 'Match';

    const taskInstructions = {
        myName: myName,
        theirName: theirName,
        goal: document.getElementById(SELECTORS.customInstruction).value.trim(),
        flirtyValue: Number(document.getElementById(SELECTORS.flirtySlider).value),
        lengthValue: Number(document.getElementById(SELECTORS.lengthSlider).value),
        linguisticStyle: document.getElementById(SELECTORS.linguisticStyleSelect).value,
        emojiStrategy: document.getElementById(SELECTORS.emojiStrategySelect).value,
        temperature: parseFloat(document.getElementById(SELECTORS.temperatureSlider).value),
        top_p: parseFloat(document.getElementById(SELECTORS.topPSlider).value),
        endWithQuestion: document.getElementById(SELECTORS.questionToggleCheckbox).checked,
        strictGoalOverride: document.getElementById(SELECTORS.strictGoalToggle).checked,
        forceNewTopic: document.getElementById(SELECTORS.newTopicToggle).checked,
        local_model_name: document.getElementById(SELECTORS.localModelName).value,
    };

    return {
        uuid: state.currentMatchUUID,
        taskInstructions: taskInstructions,
        myProfile: myProfile,
        forceIncludeGeoContext: document.getElementById(SELECTORS.geoContextToggle).checked,
    };
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
    const analysis = state.sessionMatchProfile?.analysis;

    // Helper function to update and toggle visibility
    const updateDisplay = (elementId, content) => {
        const el = document.getElementById(elementId);
        if (el) {
            const hasContent = content !== null && content !== undefined && content !== '';
            el.textContent = hasContent ? content : '';
            el.classList.toggle('hidden', !hasContent);
        }
    };

    if (!analysis) {
        updateDisplay(SELECTORS.conversationStatusDisplay, 'Status: Analyzing...');
        updateDisplay(SELECTORS.dateArcPhaseDisplay, null);
        updateDisplay(SELECTORS.sexualTensionDisplay, null);
        updateDisplay(SELECTORS.suggestedActionDisplay, null);
        const dateIdeaBtn = document.getElementById(SELECTORS.dateIdeaBtn);
        if (dateIdeaBtn) dateIdeaBtn.classList.add('hidden');
        return;
    }

    const { conversationState, memory, sexualAnalysis, responseSuggestions } = analysis;
    const dateArcPhase = memory?.dateArcPhase;
    const sexualTension = sexualAnalysis?.sexualTensionScore;
    const suggestedAction = responseSuggestions?.suggestedNextAction;

    const stateDisplayMap = {
        'OPENER': 'Status: New Conversation (Opener)',
        'EARLY_CONVO': 'Status: Early Conversation',
        'ACTIVE_CONVO': 'Status: Active Conversation',
        'REENGAGING_DAY': 'Status: Re-engaging (1-7 day pause)',
        'REENGAGING_WEEK': 'Status: Re-engaging (1-4 week pause)',
        'REENGAGING_MONTH': 'Status: Re-engaging (1+ month pause)'
    };
    updateDisplay(SELECTORS.conversationStatusDisplay, stateDisplayMap[conversationState] || 'Status: Unknown');
    updateDisplay(SELECTORS.dateArcPhaseDisplay, dateArcPhase ? `Date Arc: ${dateArcPhase}` : null);
    updateDisplay(SELECTORS.sexualTensionDisplay, (sexualTension !== null && sexualTension !== undefined) ? `Tension: ${Math.round(sexualTension * 100)}%` : null);
    updateDisplay(SELECTORS.suggestedActionDisplay, suggestedAction ? `Suggestion: ${suggestedAction.replace(/_/g, ' ')}` : null);


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