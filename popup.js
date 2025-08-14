// --- Global State ---
let state = {
    prompts: null,
    settings: {},
    uiOptions: [],
    scrapedData: null,
    matchId: null,
    isDirty: false
};

const debugModalState = {
    isRendered: false,
    currentPage: 0,
    totalPages: 0,
    pages: []
};

// --- Settings & Managers ---
const SETTINGS_DEFAULTS = {
    nlpUrl: 'http://10.0.0.24:8080',
    apiUrl: 'http://localhost:8080/v1/chat/completions',
    modelName: 'llama3:latest',
    apiKey: '',
    location: 'charlotte_nc',
    myProfile: '',
    costPer1kTokens: 0.002
};

const settingsManager = {
    async get() {
        return new Promise(resolve => chrome.storage.local.get(SETTINGS_DEFAULTS, resolve));
    },
    async save(settings) {
        return new Promise(resolve => chrome.storage.local.set(settings, resolve));
    },
    async reset() {
        await new Promise(resolve => chrome.storage.local.clear(resolve));
        return this.get();
    }
};

const historyManager = {
    async get() {
        const data = await new Promise(r => chrome.storage.local.get({ responseHistory: [] }, r));
        return data.responseHistory;
    },
    async add(responseText) {
        const history = await this.get();
        history.unshift(responseText); // Add to the beginning
        if (history.length > 10) history.pop(); // Keep only the last 10
        return new Promise(r => chrome.storage.local.set({ responseHistory: history }, r));
    }
};

// --- Event Listeners & Handlers ---
function initEventListeners() {
    document.getElementById('main-action-button').addEventListener('click', handleMainActionClick);
    document.getElementById('reset-button').addEventListener('click', handleResetClick);
    document.getElementById('settings-button').addEventListener('click', () => { document.getElementById('main-view').style.display = 'none'; document.getElementById('settings-view').style.display = 'block'; });
    document.getElementById('back-button').addEventListener('click', () => { document.getElementById('settings-view').style.display = 'none'; document.getElementById('main-view').style.display = 'block'; });
    document.getElementById('debug-checkbox').addEventListener('change', updateMainButtonState);
    document.getElementById('debug-close-button').addEventListener('click', () => { document.getElementById('debug-modal').style.display = 'none'; document.getElementById('debug-checkbox').checked = false; updateMainButtonState(); });
    document.getElementById('debug-next-button').addEventListener('click', () => navigateDebugModal(1));
    document.getElementById('debug-back-button').addEventListener('click', () => navigateDebugModal(-1));
    document.getElementById('debug-regenerate-button').addEventListener('click', handleModalRegenerateClick);
    document.getElementById('debug-generate-button').addEventListener('click', handleGenerateClick);
    document.getElementById('debug-copy-prompt-button').addEventListener('click', () => { const text = document.getElementById('debug-prompt-display').value; navigator.clipboard.writeText(text); const btn = document.getElementById('debug-copy-prompt-button'); const originalText = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = originalText; }, 1500); });
    chrome.runtime.onMessage.addListener(async (message) => { if (message.type === 'GENERATION_COMPLETE' || message.type === 'GENERATION_ERROR') { hideSpinner(); document.getElementById('main-action-button').disabled = false; updateMainButtonState(); const isError = message.type === 'GENERATION_ERROR'; const text = isError ? message.payload.error : message.payload.text; displayError(text); if (!isError) { await historyManager.add(text); const history = await historyManager.get(); renderResponseHistory(history); } } });
}
function handleMainActionClick() {
    const button = document.getElementById('main-action-button');
    if (button.textContent === 'Re-Analyze') {
        if (document.getElementById('debug-checkbox').checked) {
            const modal = document.getElementById('debug-modal');
            if (!debugModalState.isRendered) {
                renderDebugModal();
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
    renderDynamicUI();
    document.getElementById('custom-instructions').value = '';
    document.getElementById('end-with-question').checked = true;
    document.getElementById('start-fresh').checked = false;
    document.getElementById('strict-goal').checked = false;
    document.getElementById('override-geo').checked = false;
    addDirtyListeners();
    state.isDirty = false;
    updateMainButtonState();
}
function updateMainButtonState() {
    const button = document.getElementById('main-action-button');
    const isDirty = state.isDirty || document.getElementById('debug-checkbox').checked;
    button.textContent = isDirty ? 'Re-Analyze' : 'Generate';
}
function addDirtyListeners() {
    const selectors = '.dynamic-panel input, .dynamic-panel select, .dynamic-panel textarea, #custom-instructions, #end-with-question, #debug-checkbox, #start-fresh, #strict-goal, #override-geo';
    document.querySelectorAll(selectors).forEach(el => {
        el.addEventListener('input', () => {
            if (!state.isDirty) {
                state.isDirty = true;
                updateMainButtonState();
            }
        });
    });
}
async function handleRegenerateClick() {
    const regenBtn = document.getElementById('main-action-button'); regenBtn.disabled = true; showSpinner();
    try {
        if (!state.matchId || !state.scrapedData) throw new Error("Initial analysis data not found.");
        const uiSettings = getFullUiSettings();
        const payload = { matchId: state.matchId, scraped_data: state.scrapedData, ui_settings: uiSettings };
        const response = await fetch(`${state.settings.nlpUrl}/api/v1/regenerate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const newPrompts = await response.json();
        state.prompts = newPrompts;
        renderCostAnalysis(newPrompts.token_count);
        updateStatus('Regeneration complete.');
        state.isDirty = false;
        updateMainButtonState();
    } catch (error) { displayError(`Regeneration failed: ${error.message}`); }
    finally { hideSpinner(); regenBtn.disabled = false; }
}
async function handleModalRegenerateClick() {
    const debugSettings = {};
    const debugContainer = document.getElementById('debug-modal-content-area');
    const inputs = debugContainer.querySelectorAll('select, input[type="range"], input[type="checkbox"], textarea');
    inputs.forEach(input => { debugSettings[input.id] = input.type === 'checkbox' ? input.checked : input.value; });
    const allSettings = { ...getFullUiSettings(), ...debugSettings };
    showSpinner();
    try {
        const payload = { matchId: state.matchId, scraped_data: state.scrapedData, ui_settings: allSettings };
        const response = await fetch(`${state.settings.nlpUrl}/api/v1/regenerate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const newPrompts = await response.json();
        state.prompts = newPrompts;
        document.getElementById('debug-prompt-display').value = `SYSTEM:\n${newPrompts.system_prompt}\n\nUSER:\n${newPrompts.user_prompt}`;
        renderCostAnalysis(newPrompts.token_count);
        navigateDebugModal(1);
    } catch (error) { displayError(`Modal regenerate failed: ${error.message}`); }
    finally { hideSpinner(); }
}
async function handleGenerateClick() { if (!state.prompts) { displayError("No prompts available."); return; } const generateBtn = document.getElementById('main-action-button'); generateBtn.disabled = true; showSpinner(); chrome.runtime.sendMessage({ type: 'GENERATE_TEXT', payload: { prompts: state.prompts, settings: state.settings } }); document.getElementById('debug-modal').style.display = 'none'; document.getElementById('debug-checkbox').checked = false; }
function getTuneResponseSettings() { const settings = {}; document.querySelectorAll('.dynamic-panel .control-wrapper').forEach(wrapper => { const input = wrapper.querySelector('input, select, textarea'); if (input) { settings[input.id] = input.type === 'checkbox' ? input.checked : input.value; } }); settings.endWithQuestion = document.getElementById('end-with-question').checked; return settings; }
function getFullUiSettings() { const settings = getTuneResponseSettings(); settings.myLocation = state.settings.location; settings.myProfile = state.settings.myProfile; settings.local_model_name = state.settings.modelName; return settings; }

// --- Settings & Managers ---
const SETTINGS_DEFAULTS = { nlpUrl: 'http://localhost:8000', apiUrl: 'http://localhost:8080/v1/chat/completions', modelName: 'llama3:latest', apiKey: '', location: 'charlotte_nc', myProfile: '', costPer1kTokens: 0.002 };
const settingsManager = { async get() { return new Promise(resolve => chrome.storage.local.get(SETTINGS_DEFAULTS, resolve)); }, async save(settings) { return new Promise(resolve => chrome.storage.local.set(settings, resolve)); }, async reset() { await new Promise(resolve => chrome.storage.local.clear(resolve)); return this.get(); } };
const historyManager = { async get() { const data = await new Promise(r => chrome.storage.local.get({ responseHistory: [] }, r)); return data.responseHistory; }, async add(responseText) { const history = await this.get(); history.unshift(responseText); if (history.length > 10) history.pop(); return new Promise(r => chrome.storage.local.set({ responseHistory: history }, r)); } };

function initSettingsPanel() {
    const settingsIds = { 'nlp-url': 'nlpUrl', 'api-url': 'apiUrl', 'model-name': 'modelName', 'api-key': 'apiKey', 'cost-per-1k-tokens': 'costPer1kTokens', 'location': 'location', 'my-profile': 'myProfile' };
    for (const [id, key] of Object.entries(settingsIds)) {
        const input = document.getElementById(id);
        if (input) {
            input.value = state.settings[key] || '';
            input.addEventListener('input', async (e) => {
                const value = e.target.value;
                if (id === 'location' && value === 'auto') { handleAutoDetectLocation(); }
                else { state.settings[key] = value; await settingsManager.save(state.settings); }
                if (id.includes('url')) { if (validateUrlField(input)) { try { const url = new URL(value); chrome.permissions.request({ origins: [`${url.protocol}//${url.hostname}/*`] }); } catch(e) { console.warn("Could not request optional permission:", e)} } }
            });
            if (id.includes('url')) validateUrlField(input);
        }
    }
    document.getElementById('reset-settings-button').addEventListener('click', async () => { state.settings = await settingsManager.reset(); initSettingsPanel(); });
    document.getElementById('test-nlp-button').addEventListener('click', () => handleTestConnection('nlp'));
    document.getElementById('test-llm-button').addEventListener('click', () => handleTestConnection('llm'));
}
async function handleTestConnection(type) {
    const urlId = type === 'nlp' ? 'nlp-url' : 'api-url';
    const baseUrl = document.getElementById(urlId).value;
    const validationMsg = document.getElementById(`${urlId}-validation`);
    if (!validateUrlField(document.getElementById(urlId))) return;
    validationMsg.textContent = 'Testing...';
    validationMsg.style.color = 'var(--secondary-text-color)';
    try {
        const testUrl = type === 'nlp' ? `${baseUrl}/health` : baseUrl;
        const method = type === 'nlp' ? 'GET' : 'OPTIONS';
        const response = await fetch(testUrl, { method });
        if (response.ok) { validationMsg.textContent = 'Connection successful!'; validationMsg.style.color = 'var(--highlight-color)'; }
        else { throw new Error(`Server responded with status ${response.status}`); }
    } catch (error) {
        validationMsg.textContent = `Test failed: ${error.message}`;
        validationMsg.style.color = 'var(--error-color)';
    }
}
function validateUrlField(input) { const validationMsg = input.parentElement.nextElementSibling; try { new URL(input.value); validationMsg.textContent = ''; return true; } catch (_) { validationMsg.textContent = 'Invalid URL format.'; return false; } }
async function handleAutoDetectLocation() {
    const locationInput = document.getElementById('location');
    locationInput.disabled = true;
    const success = (position) => {
        const { latitude, longitude } = position.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(response => response.json()).then(async data => {
                if (data && data.address) {
                    const { city, state, country } = data.address;
                    const locationString = `${city}, ${state}, ${country}`;
                    if (!Array.from(locationInput.options).find(o => o.value === locationString)) {
                        locationInput.innerHTML += `<option value="${locationString}">${locationString} (Auto)</option>`;
                    }
                    locationInput.value = locationString;
                    state.settings.location = locationString;
                    await settingsManager.save(state.settings);
                } else { throw new Error("Invalid response from geocoding API."); }
            }).catch(err => {
                console.error("Reverse geocoding failed:", err);
                locationInput.value = 'charlotte_nc'; state.settings.location = 'charlotte_nc';
                settingsManager.save(state.settings);
            }).finally(() => { locationInput.disabled = false; });
    };
    const error = () => {
        console.error("Geolocation failed.");
        locationInput.value = 'charlotte_nc'; state.settings.location = 'charlotte_nc';
        settingsManager.save(state.settings);
        locationInput.disabled = false;
    };
    navigator.geolocation.getCurrentPosition(success, error);
}

// --- Backend Communication ---
async function scrapeAndAnalyze(uiSettings = {}, tab) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-scraper.js'] });
    const scraperFunctionName = tab.url.includes('tinder.com') ? 'scrapeTinderPage' : 'scrapeBumblePage';
    const injectionResults = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (name) => window[name](), args: [scraperFunctionName] });
    const scrapedDataResult = injectionResults[0].result;
    if (!scrapedDataResult || scrapedDataResult.error) throw new Error(`Scraping failed: ${scrapedDataResult.error || 'No data'}`);
    state.scrapedData = { myName: scrapedDataResult.myName, theirName: scrapedDataResult.theirName, theirProfile: scrapedDataResult.theirProfile, conversationHistory: scrapedDataResult.conversationHistory, theirLocationString: scrapedDataResult.theirLocationString };
    state.matchId = 'mock_' + btoa(scrapedDataResult.theirName).substring(0, 10);
    const payload = { matchId: state.matchId, scraped_data: state.scrapedData, ui_settings: { myLocation: state.settings.location, myProfile: state.settings.myProfile, local_model_name: state.settings.modelName, ...uiSettings } };
    const response = await fetch(`${state.settings.nlpUrl}/api/v1/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Analysis API failed with status ${response.status}: ${errorBody}`);
    }
    const analysisResult = await response.json();
    state.prompts = analysisResult.prompts;
    return analysisResult;
}

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    state.settings = await settingsManager.get();
    await loadUiOptions();
    if (state.uiOptions.length === 0) return;
    renderDynamicUI();
    initEventListeners();
    initSettingsPanel();
    const history = await historyManager.get();
    renderResponseHistory(history);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && (tab.url.includes('tinder.com') || tab.url.includes('bumble.com'))) {
        showSpinner();
        try {
            const analysisResult = await scrapeAndAnalyze({}, tab);
            populateUI(analysisResult.applied_ui_settings);
            updateStatus(`Analysis complete: ${analysisResult.full_analysis.strategicGoal.type}`);
            renderGeoInfo(analysisResult);
            renderCostAnalysis(analysisResult.prompts.token_count);
            state.prompts = analysisResult.prompts;
            document.getElementById('main-action-button').disabled = false;
        } catch (error) {
            displayError(`Failed to analyze page: ${error.message}`);
        } finally {
            hideSpinner();
        }
    } else {
        displayError("Not on a supported page.");
        document.getElementById('main-action-button').disabled = true;
    }
});

async function loadUiOptions() {
    const storedData = await chrome.storage.local.get('uiOptions');
    if (storedData.uiOptions && Array.isArray(storedData.uiOptions) && storedData.uiOptions.length > 0) {
        state.uiOptions = storedData.uiOptions;
    } else {
        console.warn("UI configuration not found in cache. Fetching from network...");
        try {
            const nlpUrl = (await settingsManager.get()).nlpUrl;
            if (!nlpUrl) throw new Error("NLP Service URL is not set.");
            const response = await fetch(`${nlpUrl}/api/v1/options/all`);
            if (!response.ok) throw new Error(`API Error ${response.status}`);
            const options = await response.json();
            await chrome.storage.local.set({ uiOptions: options });
            state.uiOptions = options;
        } catch (error) {
            displayError(`Critical: Could not fetch UI configuration. ${error.message}`);
        }
    }
}

// --- UI Rendering ---
function renderDynamicUI() {
    const mainViewContainer = document.getElementById('main-view');
    document.querySelectorAll('.dynamic-panel').forEach(el => el.remove());
    const mainGroups = ["Core Controls", "Style & Voice"];
    state.uiOptions.forEach((group) => {
        if (mainGroups.includes(group.groupName)) {
            const panel = createCollapsiblePanel(group);
            mainViewContainer.insertBefore(panel, document.getElementById('geo-info-section'));
        }
    });
    addDirtyListeners();
}
function createCollapsiblePanel(group) {
    const panel = document.createElement('div');
    panel.className = 'collapsible-panel dynamic-panel';
    panel.innerHTML = `<h2 class="panel-title">${group.groupName}</h2><div class="panel-content"></div>`;
    const content = panel.querySelector('.panel-content');
    group.parameters.forEach(param => content.appendChild(createControlElement(param)));
    return panel;
}
function createControlElement(param) {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-wrapper';
    const label = document.createElement('label');
    label.setAttribute('for', param.name);
    label.textContent = param.displayName;
    wrapper.appendChild(label);
    if (param.description) {
        const infoIcon = document.createElement('div');
        infoIcon.className = 'info-icon';
        infoIcon.textContent = 'i';
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = param.description;
        infoIcon.appendChild(tooltip);
        wrapper.appendChild(infoIcon);
    }
    let element;
    switch (param.uiType) {
        case 'slider': element = document.createElement('input'); element.type = 'range'; element.id = param.name; if (param.constraints) { element.min = param.constraints.min; element.max = param.constraints.max; element.step = param.constraints.step; } element.value = param.defaultValue; break;
        case 'dropdown': element = document.createElement('select'); element.id = param.name; if (param.constraints && param.constraints.allowedValues) { param.constraints.allowedValues.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.description; element.appendChild(option); }); } element.value = param.defaultValue; break;
        case 'checkbox': wrapper.classList.add('toggle-switch'); element = document.createElement('input'); element.type = 'checkbox'; element.id = param.name; element.checked = param.defaultValue; break;
        case 'text_input': element = document.createElement('textarea'); element.id = param.name; element.placeholder = param.description; element.value = param.defaultValue; break;
    }
    if (element) wrapper.appendChild(element);
    return wrapper;
}
function populateUI(settings) { if (!settings) return; for (const [key, value] of Object.entries(settings)) { const el = document.getElementById(key); if (el) { if (el.type === 'checkbox') el.checked = value; else el.value = value; } } }
function displayError(message) { const box = document.getElementById('message-box'); box.textContent = message; box.style.borderColor = 'var(--error-color)'; box.style.color = 'var(--error-color)'; box.style.display = 'block'; }
function updateStatus(message) { const el = document.getElementById('tune-response-status'); if (el) el.textContent = message; }
function renderGeoInfo(analysisData) { const container = document.getElementById('geo-info-container'); const section = document.getElementById('geo-info-section'); if (!container || !section || !analysisData?.full_analysis?.memory) return; const { userLocation, matchLocation } = analysisData.full_analysis.memory; if (!userLocation && !matchLocation) return; container.innerHTML = `<p><strong>My Location:</strong> ${userLocation || 'N/A'}</p><p><strong>Match Location:</strong> ${matchLocation || 'N/A'}</p>`; section.style.display = 'block'; }
function renderCostAnalysis(tokenCount) { const container = document.getElementById('cost-analysis-container'); const section = document.getElementById('cost-analysis-section'); if (tokenCount === null || tokenCount === undefined) { section.style.display = 'none'; return; } const cost = (tokenCount / 1000) * state.settings.costPer1kTokens; container.innerHTML = `<p><strong>Tokens:</strong> ${tokenCount} | <strong>Est. Cost:</strong> $${cost.toFixed(5)}</p>`; section.style.display = 'block'; }
function renderResponseHistory(history) { const container = document.getElementById('history-container'); const section = document.getElementById('history-section'); container.innerHTML = ''; if (history.length === 0) { section.style.display = 'none'; return; } section.style.display = 'block'; history.forEach(text => { const item = document.createElement('div'); item.className = 'history-item'; item.innerHTML = `<div class="history-item-text"></div><div class="history-item-actions"><button class="copy-btn">Copy</button><button class="use-btn">Use</button></div>`; item.querySelector('.history-item-text').textContent = text; item.querySelector('.copy-btn').addEventListener('click', () => navigator.clipboard.writeText(text)); item.querySelector('.use-btn').addEventListener('click', () => { document.getElementById('message-box').textContent = text; }); container.appendChild(item); }); }
function showSpinner() { document.getElementById('spinner').style.display = 'block'; }
function hideSpinner() { document.getElementById('spinner').style.display = 'none'; }
function renderDebugModal() {
    const debugModalContainer = document.getElementById('debug-modal-content-area');
    debugModalContainer.innerHTML = '';
    debugModalState.pages = [];
    const debugGroups = ["Overrides & Manual Control", "Advanced & Debug"];
    state.uiOptions.forEach((group) => {
        if (debugGroups.includes(group.groupName)) {
            const page = createDebugPage(group, debugModalState.pages.length);
            debugModalContainer.appendChild(page);
            debugModalState.pages.push(page);
        }
    });
    const promptPage = document.createElement('div');
    promptPage.className = 'debug-page';
    promptPage.dataset.pageIndex = debugModalState.pages.length;
    promptPage.innerHTML = `<h3>Generated Prompts</h3><textarea id="debug-prompt-display" readonly style="width: 100%; height: 200px;"></textarea>`;
    debugModalContainer.appendChild(promptPage);
    debugModalState.pages.push(promptPage);
    debugModalState.totalPages = debugModalState.pages.length;
}
function createDebugPage(group, index) {
    const page = document.createElement('div');
    page.className = 'debug-page';
    page.dataset.pageIndex = index;
    page.innerHTML = `<h3 class="panel-title">${group.groupName}</h3><p class="panel-status">${group.groupDescription}</p>`;
    group.parameters.forEach(param => page.appendChild(createControlElement(param)));
    return page;
}
function navigateDebugModal(direction) {
    const { currentPage, totalPages, pages } = debugModalState;
    let newPage = currentPage + direction;
    if (newPage < 0 || newPage >= totalPages) return;
    if(pages[currentPage]) pages[currentPage].classList.remove('active');
    if(pages[newPage]) pages[newPage].classList.add('active');
    debugModalState.currentPage = newPage;
    document.getElementById('debug-back-button').style.display = newPage > 0 ? 'block' : 'none';
    const isLastSettingsPage = newPage === totalPages - 2;
    const isPromptPage = newPage === totalPages - 1;
    document.getElementById('debug-next-button').style.display = !isLastSettingsPage && !isPromptPage ? 'block' : 'none';
    document.getElementById('debug-regenerate-button').style.display = isLastSettingsPage ? 'block' : 'none';
    document.getElementById('debug-generate-button').style.display = isPromptPage ? 'block' : 'none';
    document.getElementById('debug-copy-prompt-button').style.display = isPromptPage ? 'block' : 'none';
}
