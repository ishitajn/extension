// --- Global State ---
let state = {
    prompts: null,
    settings: {},
    uiOptions: {}
};

const debugModalState = {
    isRendered: false,
    currentPage: 0,
    totalPages: 0,
    pages: []
};

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load settings and cached UI options
    state.settings = await settingsManager.get();
    const storedData = await chrome.storage.local.get('uiOptions');

    if (!storedData.uiOptions) {
        displayError("UI configuration not found. Please try reinstalling the extension.");
        return;
    }
    state.uiOptions = storedData.uiOptions;

    // 2. Render the dynamic sections of the UI from cached options
    renderTuneResponseSection(state.uiOptions);

    // 3. Initialize all event listeners and the settings panel
    initEventListeners();
    initSettingsPanel(state.settings);

    // 4. Load and render initial history
    const history = await historyManager.get();
    renderResponseHistory(history);

    // 4. Check if on a valid page, inject observers, and then scrape and analyze
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && (tab.url.includes('tinder.com') || tab.url.includes('bumble.com'))) {
        showSpinner();
        try {
            // Inject the observer script to watch for new messages
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['observer.js'],
            });

            const analysisResult = await scrapeAndAnalyze({}, tab);
            populateUI(analysisResult.applied_ui_settings);
            updateStatus(`Analysis complete for ${analysisResult.full_analysis.conversationState}`);
            renderGeoInfo(analysisResult);
            state.prompts = analysisResult.prompts;
            document.getElementById('reanalyze-button').disabled = false;
        } catch (error) {
            displayError(`Failed to analyze page: ${error.message}`);
        } finally {
            hideSpinner();
        }
    } else {
        displayError("Not on a supported page (Tinder or Bumble).");
        document.getElementById('generate-button').disabled = true;
    }
});

// --- UI Rendering ---

function renderTuneResponseSection(uiOptions) {
    const container = document.getElementById('tune-response-container');
    container.innerHTML = '';
    const sectionsToRender = ['style_settings', 'strategy_settings'];
    sectionsToRender.forEach(key => {
        const group = uiOptions[key];
        if (!group) return;
        for (const [paramId, paramConfig] of Object.entries(group.parameters)) {
            if (paramId === 'endWithQuestion') continue;
            container.appendChild(createControlElement(paramId, paramConfig));
        }
    });
}

function renderDebugModal(uiOptions) {
    const container = document.getElementById('debug-modal-content-area');
    container.innerHTML = '';
    const powerSettings = uiOptions.power_user_settings;
    if (!powerSettings) return;

    const pageDiv = document.createElement('div');
    pageDiv.className = 'debug-page';
    pageDiv.dataset.pageIndex = 0;
    const title = document.createElement('h3');
    title.textContent = powerSettings.title;
    pageDiv.appendChild(title);
    for (const [paramId, paramConfig] of Object.entries(powerSettings.parameters)) {
        pageDiv.appendChild(createControlElement(paramId, paramConfig));
    }
    const jsonViewer = document.createElement('div');
    jsonViewer.className = 'json-viewer';
    jsonViewer.innerHTML = `<div class="json-viewer-header">View JSON &square;</div><pre class="json-viewer-content"></pre>`;
    pageDiv.appendChild(jsonViewer);
    container.appendChild(pageDiv);
    pageDiv.querySelector('.json-viewer-header').addEventListener('click', (e) => {
        const content = e.target.nextElementSibling;
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });
    pageDiv.querySelector('.json-viewer-content').textContent = JSON.stringify(powerSettings, null, 2);

    debugModalState.pages = [pageDiv];
    const promptPage = document.createElement('div');
    promptPage.className = 'debug-page';
    promptPage.dataset.pageIndex = 1;
    promptPage.innerHTML = `<h3>Generated Prompts</h3><textarea id="debug-prompt-display" readonly style="width: 100%; height: 200px;"></textarea>`;
    container.appendChild(promptPage);
    debugModalState.pages.push(promptPage);
    debugModalState.totalPages = 2;
    navigateDebugModal(0);
}

function createControlElement(id, config) {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-wrapper';
    if(config.label) {
        const label = document.createElement('label');
        label.setAttribute('for', id);
        label.textContent = config.label;
        wrapper.appendChild(label);
    }
    let element;
    if (config.ui_type === 'slider') {
        element = document.createElement('input');
        element.type = 'range';
        element.id = id;
        element.min = config.min;
        element.max = config.max;
        element.step = config.step;
    } else if (config.ui_type === 'dropdown') {
        element = document.createElement('select');
        element.id = id;
        config.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.key;
            option.textContent = opt.name;
            element.appendChild(option);
        });
    } else if (config.ui_type === 'separator') {
        return document.createElement('hr');
    }
    if (element) wrapper.appendChild(element);
    return wrapper;
}

function populateUI(settings) {
    for (const [key, value] of Object.entries(settings)) {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') element.checked = value;
            else element.value = value;
        }
    }
}

function displayError(message) {
    const messageBox = document.getElementById('message-box');
    messageBox.textContent = message;
    messageBox.style.borderColor = 'var(--error-color)';
    messageBox.style.color = 'var(--error-color)';
    messageBox.style.display = 'block';
}

function updateStatus(message) {
    const statusEl = document.getElementById('tune-response-status');
    if (statusEl) statusEl.textContent = message;
}

function renderGeoInfo(analysisData) {
    const container = document.getElementById('geo-info-container');
    const section = document.getElementById('geo-info-section');
    if (!container || !section || !analysisData?.full_analysis) return;

    const { userLocation, matchLocation, estimatedDistanceKm } = analysisData.full_analysis;

    if (!userLocation && !matchLocation) return;

    let content = '';
    if (userLocation) content += `<p><strong>My Location:</strong> ${userLocation}</p>`;
    if (matchLocation) content += `<p><strong>Match Location:</strong> ${matchLocation}</p>`;
    if (estimatedDistanceKm) content += `<p><strong>Distance:</strong> ~${estimatedDistanceKm} km</p>`;

    container.innerHTML = content;
    section.style.display = 'block';
}

function showSpinner() {
    document.getElementById('spinner').style.display = 'block';
}

function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
}

function navigateDebugModal(direction) {
    const { currentPage, totalPages, pages } = debugModalState;
    let newPage = currentPage + direction;
    if (newPage < 0 || newPage >= totalPages) return;

    pages[currentPage].classList.remove('active');
    pages[newPage].classList.add('active');
    debugModalState.currentPage = newPage;

    const nextBtn = document.getElementById('debug-next-button');
    const backBtn = document.getElementById('debug-back-button');
    const reanalyzeBtn = document.getElementById('debug-reanalyze-button');
    const generateBtn = document.getElementById('debug-generate-button');

    backBtn.style.display = newPage > 0 ? 'block' : 'none';
    nextBtn.style.display = newPage === 0 ? 'block' : 'none';
    reanalyzeBtn.style.display = newPage === 0 ? 'block' : 'none';
    generateBtn.style.display = newPage === 1 ? 'block' : 'none';
}

// --- Event Listeners & Handlers ---

function initEventListeners() {
    // Main view
    document.getElementById('reanalyze-button').addEventListener('click', handleReanalyzeClick);
    document.getElementById('generate-button').addEventListener('click', handleGenerateClick);

    // Settings view
    document.getElementById('settings-button').addEventListener('click', () => {
        document.getElementById('main-view').style.display = 'none';
        document.getElementById('settings-view').style.display = 'block';
    });
    document.getElementById('back-button').addEventListener('click', () => {
        document.getElementById('settings-view').style.display = 'none';
        document.getElementById('main-view').style.display = 'block';
    });

    // Debug modal
    document.getElementById('debug-checkbox').addEventListener('change', (e) => {
        const modal = document.getElementById('debug-modal');
        if (e.target.checked) {
            if (!debugModalState.isRendered) {
                renderDebugModal(state.uiOptions);
                debugModalState.isRendered = true;
            }
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    });
    document.getElementById('debug-close-button').addEventListener('click', () => {
        document.getElementById('debug-modal').style.display = 'none';
        document.getElementById('debug-checkbox').checked = false;
    });
    document.getElementById('debug-next-button').addEventListener('click', () => navigateDebugModal(1));
    document.getElementById('debug-back-button').addEventListener('click', () => navigateDebugModal(-1));
    document.getElementById('debug-reanalyze-button').addEventListener('click', handleModalReanalyzeClick);
    document.getElementById('debug-generate-button').addEventListener('click', handleGenerateClick);

    // Background script listener
    chrome.runtime.onMessage.addListener(async (message) => {
        if (message.type === 'GENERATION_COMPLETE' || message.type === 'GENERATION_ERROR') {
            hideSpinner();
            timer.stop();
            document.getElementById('generate-button').disabled = false;
            document.getElementById('generate-button').textContent = 'GENERATE';
            const messageBox = document.getElementById('message-box');
            messageBox.textContent = message.payload.text;
            messageBox.style.borderColor = 'var(--highlight-color)';
            messageBox.style.color = 'var(--highlight-color)';
            messageBox.style.display = 'block';
        }
    });
}

const timer = {
    _intervalId: null, _startTime: null, _displayEl: null,
    start(displayElement) { this.stop(); this._displayEl = displayElement; this._startTime = Date.now(); this._intervalId = setInterval(() => this._updateDisplay(), 1000); this._displayEl.textContent = '00:00'; },
    stop() { clearInterval(this._intervalId); this._intervalId = null; },
    _updateDisplay() { const elapsed = Math.floor((Date.now() - this._startTime) / 1000); const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0'); const seconds = String(elapsed % 60).padStart(2, '0'); if (this._displayEl) this._displayEl.textContent = `${minutes}:${seconds}`; }
};

async function handleGenerateClick() {
    if (!state.prompts) { displayError("No prompts available. Please analyze first."); return; }
    const generateBtn = document.getElementById('generate-button');
    generateBtn.disabled = true;
    generateBtn.textContent = 'GENERATING...';
    showSpinner();
    timer.start(document.getElementById('timer-display'));
    chrome.runtime.sendMessage({ type: 'GENERATE_TEXT', payload: { prompts: state.prompts, settings: state.settings } });
    document.getElementById('debug-modal').style.display = 'none';
    document.getElementById('debug-checkbox').checked = false;
}

async function handleReanalyzeClick() {
    const reanalyzeBtn = document.getElementById('reanalyze-button');
    reanalyzeBtn.disabled = true;
    reanalyzeBtn.textContent = 'Analyzing...';
    showSpinner();
    try {
        const tuneSettings = getTuneResponseSettings();
        const response = await fetch(`${state.settings.nlpUrl}/api/v1/reanalyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ui_settings: tuneSettings }) });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        state.prompts = data.prompts;
        updateStatus('Re-analysis complete. Ready to generate.');
    } catch (error) {
        displayError(`Re-analysis failed: ${error.message}`);
    } finally {
        hideSpinner();
        reanalyzeBtn.disabled = false;
        reanalyzeBtn.textContent = 'Re-analyze';
    }
}

async function handleModalReanalyzeClick() {
    const settings = {};
    const container = document.getElementById('debug-modal-content-area');
    const inputs = container.querySelectorAll('select, input[type="range"], input[type="checkbox"]');
    inputs.forEach(input => { settings[input.id] = input.type === 'checkbox' ? input.checked : input.value; });
    try {
        const response = await fetch(`${state.settings.nlpUrl}/api/v1/reanalyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ui_settings: settings }) });
        const data = await response.json();
        state.prompts = data.prompts;
        document.getElementById('debug-prompt-display').value = `SYSTEM:\n${data.prompts.system_prompt}\n\nUSER:\n${data.prompts.user_prompt}`;
        navigateDebugModal(1);
    } catch (error) {
        displayError(`Modal re-analysis failed: ${error.message}`);
    }
}

function getTuneResponseSettings() {
    const settings = {};
    const container = document.getElementById('tune-response-container');
    const inputs = container.querySelectorAll('select, input[type="range"]');
    inputs.forEach(input => { settings[input.id] = input.value; });
    return settings;
}

// --- Settings Persistence ---
const SETTINGS_DEFAULTS = {
    nlpUrl: 'http://localhost:8000',
    apiUrl: 'http://localhost:8080/v1/chat/completions',
    modelName: 'llama3:latest',
    apiKey: '',
    location: 'charlotte_nc',
    myProfile: ''
};

const settingsManager = {
    async get() {
        return new Promise(resolve => {
            chrome.storage.local.get(SETTINGS_DEFAULTS, items => resolve(items));
        });
    },
    async save(settings) {
        return new Promise(resolve => {
            chrome.storage.local.set(settings, () => resolve());
        });
    },
    async reset() {
        await new Promise(resolve => chrome.storage.local.clear(resolve));
        return this.get(); // Return defaults
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

function initSettingsPanel(settings) {
    const settingsIds = {
        'nlp-url': 'nlpUrl',
        'api-url': 'apiUrl',
        'model-name': 'modelName',
        'api-key': 'apiKey',
        'location': 'location',
        'my-profile': 'myProfile'
    };

    for (const [id, key] of Object.entries(settingsIds)) {
        const input = document.getElementById(id);
        if (input) {
            input.value = settings[key] || '';
            input.addEventListener('input', async () => {
                state.settings[key] = input.value;
                await settingsManager.save(state.settings);
                if (id.includes('url')) validateUrlField(input);
            });
            if (id.includes('url')) validateUrlField(input);
        }
    }

    document.getElementById('reset-settings-button').addEventListener('click', async () => {
        state.settings = await settingsManager.reset();
        initSettingsPanel(state.settings); // Re-initialize fields with defaults
    });

    document.getElementById('test-nlp-button').addEventListener('click', () => handleTestConnection('nlp'));
    document.getElementById('test-llm-button').addEventListener('click', () => handleTestConnection('llm'));
}

async function handleTestConnection(type) {
    const urlId = type === 'nlp' ? 'nlp-url' : 'api-url';
    const url = document.getElementById(urlId).value;
    const validationMsg = document.getElementById(`${urlId}-validation`);

    if (!validateUrlField(document.getElementById(urlId))) return;

    validationMsg.textContent = 'Testing...';
    validationMsg.style.color = 'var(--secondary-text-color)';

    try {
        // Use a simple OPTIONS request as a lightweight connectivity test
        const response = await fetch(url, { method: 'OPTIONS' });
        if (response.ok || response.status === 404) { // 404 is ok, means server is there but endpoint not found for OPTIONS
            validationMsg.textContent = 'Connection successful!';
            validationMsg.style.color = 'var(--highlight-color)';
        } else {
            throw new Error(`Server responded with status ${response.status}`);
        }
    } catch (error) {
        validationMsg.textContent = `Test failed: ${error.message}`;
        validationMsg.style.color = 'var(--error-color)';
    }
}

function validateUrlField(input) {
    const validationMsg = input.parentElement.nextElementSibling;
    try {
        new URL(input.value);
        validationMsg.textContent = '';
        return true;
    } catch (_) {
        validationMsg.textContent = 'Invalid URL format.';
        return false;
    }
}

// --- Backend Communication ---
async function scrapeAndAnalyze(uiSettings = {}, tab) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-scraper.js'], });
    let scraperFunctionName = tab.url.includes('tinder.com') ? 'scrapeTinderPage' : 'scrapeBumblePage';
    const injectionResults = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (name) => window[name](), args: [scraperFunctionName], });
    const scrapedData = injectionResults[0].result;
    if (!scrapedData || scrapedData.error) { throw new Error(`Scraping failed: ${scrapedData?.error || 'No data returned.'}`); }
    const response = await fetch(`${state.settings.nlpUrl}/api/v1/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scraped_data: scrapedData, ui_settings: uiSettings }) });
    if (!response.ok) { throw new Error(`Analysis API failed with status ${response.status}`); }
    return response.json();
}
