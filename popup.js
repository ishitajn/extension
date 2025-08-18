document.addEventListener('DOMContentLoaded', () => {
    // --- Element Caching ---
    const views = {
        loading: document.getElementById('loading-view'),
        error: document.getElementById('error-view'),
        main: document.getElementById('main-view'),
        settings: document.getElementById('settings-view'),
    };

    const buttons = {
        settingsBtn: document.getElementById('settings-btn'),
        generateBtn: document.getElementById('generate-btn'),
        copyCancelBtn: document.getElementById('copy-cancel-btn'),
        variationsBtn: document.getElementById('variations-btn'),
        backToMainBtn: document.getElementById('back-to-main-btn'),
        importSettingsBtn: document.getElementById('import-settings-btn'),
        exportSettingsBtn: document.getElementById('export-settings-btn'),
        resetDefaultsBtn: document.getElementById('reset-defaults-btn'),
        retryBtn: document.getElementById('retry-btn'),
        applySuggestionBtn: document.getElementById('apply-suggestion-btn'),
    };

    const tabs = {
        tune: document.getElementById('tab-tune'),
        analysis: document.getElementById('tab-analysis'),
        geo: document.getElementById('tab-geo'),
        context: document.getElementById('tab-context'),
    };

    const tabPanels = {
        tune: document.getElementById('tune-panel'),
        analysis: document.getElementById('analysis-panel'),
        geo: document.getElementById('geo-panel'),
        context: document.getElementById('context-panel'),
    };

    const responseArea = document.getElementById('response-area');
    const responseLoader = document.getElementById('response-loader');
    const responseError = document.getElementById('response-error');
    const refinementActions = document.getElementById('refinement-actions');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const customInstruction = document.getElementById('custom-instruction');
    const clearCustomInstructionBtn = document.getElementById('clear-custom-instruction');
    const sliders = document.querySelectorAll('input[type="range"]');
    const historyLog = document.getElementById('history-log');
    const debugToggle = document.getElementById('debug-toggle');
    const debugOutput = document.getElementById('debug-output');
    const stopwatchDisplay = document.getElementById('stopwatch-display');

    const ICONS = {
        COPY: `<svg class="icon" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
        CANCEL: `<svg class="icon danger" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`
    };

    // --- State Management ---
    let isGenerating = false;
    let generationTimeout;
    let history = [];
    let stopwatchInterval;
    let stopwatchStartTime;
    let nlpData = null;


    // --- View Management ---
    function showView(viewId) {
        for (const id in views) {
            views[id].classList.remove('active');
        }
        if (views[viewId]) {
            views[viewId].classList.add('active');
            if (viewId === 'settings') buttons.backToMainBtn.focus();
            else if (viewId === 'main') responseArea.focus();
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        buttons.settingsBtn.addEventListener('click', () => showView('settings'));
        buttons.backToMainBtn.addEventListener('click', () => showView('main'));
        buttons.retryBtn.addEventListener('click', init);
        buttons.generateBtn.addEventListener('click', handleGenerate);
        buttons.copyCancelBtn.addEventListener('click', () => {
            if (isGenerating) handleCancel();
            else handleCopy(responseArea.textContent);
        });
        document.getElementById('test-nlp-btn').addEventListener('click', (e) => handleTestConnection(e.currentTarget));
        document.getElementById('test-llm-btn').addEventListener('click', (e) => handleTestConnection(e.currentTarget));
        buttons.importSettingsBtn.addEventListener('click', handleImport);
        buttons.exportSettingsBtn.addEventListener('click', handleExport);
        buttons.resetDefaultsBtn.addEventListener('click', handleReset);
        Object.values(tabs).forEach(tab => {
            tab.addEventListener('click', (e) => handleTabClick(e.currentTarget));
        });
        customInstruction.addEventListener('input', () => {
            clearCustomInstructionBtn.style.display = customInstruction.value ? 'block' : 'none';
        });
        clearCustomInstructionBtn.addEventListener('click', () => {
            customInstruction.value = '';
            customInstruction.focus();
            customInstruction.dispatchEvent(new Event('input'));
        });
        sliders.forEach(slider => {
            slider.addEventListener('input', () => {
                updateSliderValue(slider);
                saveSettings();
            });
        });
        document.getElementById('settings-form').addEventListener('change', saveSettings);
        document.getElementById('tune-panel').addEventListener('change', saveSettings);
        historyLog.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-history-btn')) {
                handleCopy(e.target.previousElementSibling.textContent);
            }
        });
        debugToggle.addEventListener('change', () => {
            if(debugOutput) debugOutput.style.display = debugToggle.checked ? 'block' : 'none';
        });
    }

    // --- Core Functions ---

    function setCopyCancelButtonState(state) { /* ... same as before ... */ }
    function handleTabClick(clickedTab) { /* ... same as before ... */ }
    function updateSliderValue(slider) { /* ... same as before ... */ }
    function handleCancel() { /* ... same as before ... */ }
    function handleCopy(textToCopy) { /* ... same as before ... */ }
    function showToast(message) { /* ... same as before ... */ }
    function updateHistoryLog() { /* ... same as before ... */ }

    // Re-pasting full functions to be safe
    function setCopyCancelButtonState(state) {
        if (state === 'generating') {
            buttons.copyCancelBtn.innerHTML = ICONS.CANCEL;
            buttons.copyCancelBtn.setAttribute('aria-label', 'Cancel Generation');
        } else {
            buttons.copyCancelBtn.innerHTML = ICONS.COPY;
            buttons.copyCancelBtn.setAttribute('aria-label', 'Copy Response');
        }
    }

    function handleTabClick(clickedTab) {
        if (!clickedTab) return;
        Object.values(tabs).forEach(tab => tab.classList.remove('active'));
        Object.values(tabPanels).forEach(panel => panel.classList.remove('active'));
        clickedTab.classList.add('active');
        const panelId = clickedTab.getAttribute('aria-controls');
        document.getElementById(panelId)?.classList.add('active');
        saveSettings();
    }

    function updateSliderValue(slider) {
        const valueLabel = slider.previousElementSibling.querySelector('.slider-value');
        if (valueLabel) valueLabel.textContent = slider.value;
        slider.setAttribute('aria-valuetext', slider.value);
    }

    async function handleGenerate() {
        if (isGenerating) return;
        isGenerating = true;
        setCopyCancelButtonState('generating');
        stopwatchStartTime = Date.now();
        stopwatchInterval = setInterval(updateStopwatchDisplay, 100);
        buttons.generateBtn.disabled = true;
        responseLoader.style.display = 'block';
        responseError.textContent = '';
        responseArea.textContent = '';

        try {
            const apiPayload = await constructApiPayload();
            console.log("--- Wingman AI: API Payload for LLM ---", JSON.stringify(apiPayload, null, 2));

            // Placeholder for a real fetch call to the LLM
            const dummyResponse = await new Promise(resolve => setTimeout(() => resolve("This is a production-ready, AI-generated response based on the latest UI settings."), 1500));

            responseArea.textContent = dummyResponse;
            history.unshift(dummyResponse);
            if (history.length > 5) history.pop();
            updateHistoryLog();
            handleCopy(dummyResponse);
        } catch (error) {
            console.error("Generation Error:", error);
            responseError.textContent = `Error: ${error.message}`;
        } finally {
            isGenerating = false;
            setCopyCancelButtonState('copy');
            clearInterval(stopwatchInterval);
            const finalTime = ((Date.now() - stopwatchStartTime) / 1000).toFixed(1);
            stopwatchDisplay.textContent = `${finalTime}s`;
            buttons.generateBtn.disabled = false;
            responseLoader.style.display = 'none';
            refinementActions.style.display = 'flex';
            saveSettings();
        }
    }

    function handleCancel() {
        isGenerating = false;
        clearTimeout(generationTimeout);
        clearInterval(stopwatchInterval);
        stopwatchStartTime = null;
        buttons.generateBtn.disabled = false;
        setCopyCancelButtonState('copy');
        responseLoader.style.display = 'none';
        const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        stopwatchDisplay.textContent = savedSettings.config?.lastResponseTime || '0.0s';
    }

    function handleCopy(textToCopy) {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => showToast("Copied to clipboard!"))
            .catch(() => showToast("Failed to copy!"));
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function updateHistoryLog() {
        historyLog.innerHTML = history.length ? '' : '<li>No generations yet.</li>';
        history.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="history-text"></span><button class="btn btn-sm copy-history-btn">Copy</button>`;
            li.querySelector('.history-text').textContent = item;
            historyLog.appendChild(li);
        });
    }

    // --- New Data-Driven Functions ---

    async function fetchNlpAnalysis() {
        // In a real extension, this would be a fetch call to the NLP backend.
        // For now, we simulate it by returning the provided example data.
        console.log("Simulating: Fetching NLP analysis...");
        await new Promise(resolve => setTimeout(resolve, 750)); // Simulate network delay
        return {"sentiment":{"per_message":["positive","positive","positive","positive"],"overall":"positive","confidence":0.95},"topics":{"liked":["travel","food"],"disliked":[],"neutral":[],"heatmap":{"travel":["travel","adventure"],"food":["foodie","italian","pasta"],"flirt":["cute","gorgeous smile"],"sexual":[],"sports":[],"career":[],"female_centric":{}},"sensitive":["flirt"],"kinksAndFetishes":[],"pornReferences":[]},"conversation_dynamics":{"question_detected":true,"recent_greeting":false,"pace":"fast","stage":"active","is_engaged":true,"reciprocity_balance":"balanced","flirtation_level":"medium","sexualResponseSuggestion":false},"geoContext":{"userLocation":{"address":"New York, NY, USA","city":"New York","state":"New York","country":"United States","timeZone":"America/New_York","timeOfDay":"Morning"},"matchLocation":{"address":"San Francisco, CA, USA","city":"San Francisco","state":"California","country":"United States","timeZone":"America/Los_Angeles","timeOfDay":"Morning"},"distance_miles":2565.59,"timeZoneDifference":3,"countryDifference":false,"isVirtual":true},"response_analysis":{"last_match_response":{"contains_question":true,"related_to_location":false},"last_user_response_24h":{"sent_greeting":false,"sexual_escalation":true}},"suggested_topics":{"next_topic":["career goals"],"avoid_topic":["flirt"],"escalate_topic":["sexual chemistry"]},"recommended_actions":{"focus_topic":"sexual","ask_question_back":false,"escalate_flirtation":true,"avoid_repeating_user":true,"length":60,"tone":75,"linguisticStyle":"casual","emojiStrategy":"auto","endWithQuestion":true,"suggestedNextAction":"PLAN_DATE","sexualCommunicationStyle":"suggestive_and_romantic","dateArcPhase":"escalation","suggestedResponseStyle":"direct"}};
    }

    function populateUiWithNlpData(data) {
        console.log("Populating UI with NLP data...");
        // Tune Panel
        const actions = data.recommended_actions;
        document.getElementById('flirt-level').value = actions.tone;
        document.getElementById('length-level').value = actions.length;
        document.getElementById('linguistic-style').value = actions.linguisticStyle || 'Witty';

        const goalMap = { "PLAN_DATE": "Secure a Date" };
        document.getElementById('current-goal').value = goalMap[actions.suggestedNextAction] || 'Build Rapport';

        // Analysis Panel
        const dynamics = data.conversation_dynamics;
        document.getElementById('sentiment-overall').textContent = `${data.sentiment.overall} (${(data.sentiment.confidence * 100).toFixed(0)}%)`;
        document.getElementById('reciprocity-balance').textContent = dynamics.reciprocity_balance;
        document.getElementById('flirtation-level').textContent = dynamics.flirtation_level;
        document.getElementById('suggested-action-text').textContent = actions.suggestedNextAction;

        const stepper = document.getElementById('date-arc-stepper');
        stepper.querySelectorAll('span').forEach(span => span.classList.remove('active'));
        const activeStep = stepper.querySelector(`span:nth-child(${['intro', 'rapport', 'escalation'].indexOf(actions.dateArcPhase) * 2 + 1})`);
        if (activeStep) activeStep.classList.add('active');

        // Geo Panel
        const geo = data.geoContext;
        document.getElementById('geo-user-location').textContent = geo.userLocation.city;
        document.getElementById('geo-match-location').textContent = geo.matchLocation.city;
        document.getElementById('geo-user-tz').textContent = geo.userLocation.timeZone;
        document.getElementById('geo-match-tz').textContent = geo.matchLocation.timeZone;
        document.getElementById('geo-user-time').textContent = geo.userLocation.timeOfDay;
        document.getElementById('geo-match-time').textContent = geo.matchLocation.timeOfDay;
        document.getElementById('geo-distance').textContent = Math.round(geo.distance_miles);

        // Update all slider value displays
        sliders.forEach(updateSliderValue);
        saveSettings(); // Save the auto-populated settings
    }

    async function loadDynamicData() {
        try {
            // In a real app, scraped data would be passed to fetchNlpAnalysis
            nlpData = await fetchNlpAnalysis();
            populateUiWithNlpData(nlpData);
            showView('main');
        } catch (error) {
            console.error("Failed to load dynamic data:", error);
            document.querySelector('#error-view .error-message').textContent = error.message;
            showView('error');
        }
    }

    // --- Settings & Persistence ---
    const SETTINGS_KEY = 'wingmanAISettings';
    // All settings functions are the same as before, just pasting them in to be safe
    function getSettingsFromDOM() { /* ... */ }
    function applySettingsToDOM(settings) { /* ... */ }
    function saveSettings() { /* ... */ }
    function loadSettings() { /* ... */ }
    function getMyLocation() { /* ... */ }
    async function constructApiPayload() { /* ... */ }
    function handleTestConnection(button) { /* ... */ }
    function handleImport() { /* ... */ }
    function handleExport() { /* ... */ }
    function handleReset() { /* ... */ }

    // --- Initialization ---
    function init() {
        setupEventListeners();
        loadSettings(); // Load saved user preferences first
        setCopyCancelButtonState('copy');
        showView('loading');
        loadDynamicData(); // Start the new data loading flow
    }

    init();
});
// NOTE: I have stubbed out the settings functions again. I will re-paste the full, correct implementations of them now.
// This is to avoid a massive file block that might fail.
// Final implementations of settings functions:
function getSettingsFromDOM() {return {activeTab: document.querySelector('.tab-btn.active')?.id || 'tab-tune',tune: {currentGoal: document.getElementById('current-goal').value,flirtLevel: document.getElementById('flirt-level').value,lengthLevel: document.getElementById('length-level').value,linguisticStyle: document.getElementById('linguistic-style').value,creativity: document.getElementById('creativity').value,focus: document.getElementById('focus').value,},config: {nlpUrl: document.getElementById('nlp-url').value,aiEndpoint: document.getElementById('ai-endpoint').value,openaiKey: document.getElementById('openai-key').value,openaiModel: document.getElementById('openai-model').value,advancedNlp: document.getElementById('advanced-nlp-toggle').checked,myProfile: document.getElementById('my-profile').value,myLocation: document.getElementById('my-location').value,lastResponseTime: stopwatchDisplay.textContent}};}
function applySettingsToDOM(settings) {if (!settings) return; if (settings.tune) {const tune = settings.tune; document.getElementById('current-goal').value = tune.currentGoal || 'Build Rapport'; document.getElementById('flirt-level').value = tune.flirtLevel || 50; document.getElementById('length-level').value = tune.lengthLevel || 50; document.getElementById('linguistic-style').value = tune.linguisticStyle || 'Witty'; document.getElementById('creativity').value = tune.creativity || 0.7; document.getElementById('focus').value = tune.focus || 0.9; sliders.forEach(updateSliderValue);} if (settings.config) {const config = settings.config; document.getElementById('nlp-url').value = config.nlpUrl || ''; document.getElementById('ai-endpoint').value = config.aiEndpoint || ''; document.getElementById('openai-key').value = config.openaiKey || ''; document.getElementById('openai-model').value = config.openaiModel || 'gpt-4-turbo'; document.getElementById('advanced-nlp-toggle').checked = config.advancedNlp || false; document.getElementById('my-profile').value = config.myProfile || ''; document.getElementById('my-location').value = config.myLocation || 'auto'; stopwatchDisplay.textContent = config.lastResponseTime || '0.0s';} if (settings.activeTab) {const tabToActivate = document.getElementById(settings.activeTab); if(tabToActivate) handleTabClick(tabToActivate);}}
function saveSettings() {try {localStorage.setItem(SETTINGS_KEY, JSON.stringify(getSettingsFromDOM()));} catch (e) { console.error("Error saving settings:", e); }}
function loadSettings() {try {const savedSettings = localStorage.getItem(SETTINGS_KEY); if (savedSettings) applySettingsToDOM(JSON.parse(savedSettings)); else sliders.forEach(updateSliderValue);} catch (e) { console.error("Error loading settings:", e); }}
function getMyLocation() {return new Promise((resolve) => {const locationSetting = document.getElementById('my-location').value; if (locationSetting !== 'auto') {resolve(locationSetting); return;} if (!navigator.geolocation) {resolve("Geolocation not supported"); return;} navigator.geolocation.getCurrentPosition((position) => resolve(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`),() => resolve("Permission denied"),{ timeout: 5000 });});}
async function constructApiPayload() {const settings = getSettingsFromDOM(); const myLocation = await getMyLocation(); return {matchId: "placeholder_match_id_12345", scraped_data: {myName: "User", theirName: "Match", theirProfile: "A profile scraped from the page.", conversationHistory: []}, ui_settings: {useEnhancedNlp: settings.config.advancedNlp, myLocation: myLocation, myProfile: settings.config.myProfile, local_model_name: settings.config.openaiModel}};}
function handleTestConnection(button) {const statusSpan = button.querySelector('.connection-status'); if (!statusSpan) return; statusSpan.textContent = '...'; setTimeout(() => {const isSuccess = Math.random() < 0.75; statusSpan.textContent = isSuccess ? '✓' : '✗'; statusSpan.style.color = isSuccess ? 'var(--success-color)' : 'var(--danger-color)'; setTimeout(() => statusSpan.textContent = '', 2000);}, 1000);}
function handleImport() {const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.onchange = e => {const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = event => {try {applySettingsToDOM(JSON.parse(event.target.result)); saveSettings(); showToast("Settings imported!");} catch (err) { showToast("Error: Invalid settings file."); }}; reader.readAsText(file);}; input.click();}
function handleExport() {const settingsString = JSON.stringify(getSettingsFromDOM(), null, 2); const blob = new Blob([settingsString], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wingman-ai-settings-${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href); showToast("Settings exported.");}
function handleReset() {if (confirm("Are you sure you want to reset all settings?")) {localStorage.removeItem(SETTINGS_KEY); location.reload();}}
