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

    let isGenerating = false;
    let generationTimeout;
    let stopwatchInterval;
    let stopwatchStartTime;
    let nlpData = null;

    function showView(viewId) {
        for (const id in views) {
            views[id].classList.remove('active');
        }
        if (views[viewId]) {
            views[viewId].classList.add('active');
        }
    }

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
        document.getElementById('tune-panel').addEventListener('change', saveSettings);
        debugToggle.addEventListener('change', () => {
            if(debugOutput) debugOutput.style.display = debugToggle.checked ? 'block' : 'none';
        });
    }

    function setCopyCancelButtonState(state) {
        const btn = buttons.copyCancelBtn;
        if (state === 'generating') {
            btn.innerHTML = ICONS.CANCEL;
            btn.setAttribute('aria-label', 'Cancel Generation');
        } else {
            btn.innerHTML = ICONS.COPY;
            btn.setAttribute('aria-label', 'Copy Response');
        }
    }

    function handleTabClick(clickedTab) {
        if (!clickedTab) return;
        Object.values(tabs).forEach(tab => tab.classList.remove('active'));
        Object.values(tabPanels).forEach(panel => panel.classList.remove('active'));
        clickedTab.classList.add('active');
        const panelId = clickedTab.getAttribute('aria-controls');
        document.getElementById(panelId)?.classList.add('active');
    }

    function updateSliderValue(slider) {
        const valueLabel = slider.parentElement.querySelector('.slider-value');
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
        refinementActions.style.display = 'none';

        try {
            const settings = getSettingsFromDOM().config;
            if (!settings.aiEndpoint || !settings.openaiKey) {
                throw new Error("AI Endpoint or API Key is not configured in settings.");
            }

            const apiPayload = await constructApiPayload();

            // For now, we are sending the entire payload to a single endpoint.
            // This assumes the endpoint is a custom server that can process this payload.
            // A more advanced implementation would first call the NLP service,
            // then use that result to construct a more specific payload for the LLM.

            const response = await fetch(settings.aiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.openaiKey}`
                },
                body: JSON.stringify(apiPayload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }

            const result = await response.json();
            const generatedText = result.response || "No response text found.";

            responseArea.textContent = generatedText;
            // Optionally, auto-copy the response
            // handleCopy(generatedText);

        } catch (error) {
            responseError.textContent = `Error: ${error.message}`;
        } finally {
            isGenerating = false;
            setCopyCancelButtonState('copy');
            clearInterval(stopwatchInterval);
            if (stopwatchStartTime) {
                 const finalTime = ((Date.now() - stopwatchStartTime) / 1000).toFixed(1);
                 stopwatchDisplay.textContent = `${finalTime}s`;
            }
            buttons.generateBtn.disabled = false;
            responseLoader.style.display = 'none';
            refinementActions.style.display = 'flex';
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
        const savedSettings = JSON.parse(localStorage.getItem('wingmanAISettings') || '{}');
        stopwatchDisplay.textContent = savedSettings.config?.lastResponseTime || '0.0s';
    }

    function handleCopy(textToCopy) {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => showToast("Copied!"))
            .catch(() => showToast("Copy failed"));
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function fetchScrapedData() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'scrapePage' }, (response) => {
                if (chrome.runtime.lastError) {
                    // Handle errors related to the extension system itself
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.error) {
                    // Handle errors sent back from our background or content script
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }


    function populateUiWithNlpData(scrapedData, nlpAnalysis = null) {
        console.log("Populating UI with Scraped Data:", scrapedData);
        console.log("Populating UI with NLP Analysis:", nlpAnalysis);

        // --- Helper to safely set values ---
        const setField = (id, value, property = 'textContent') => {
            const el = document.getElementById(id);
            if (el) {
                if (property === 'value' || property === 'checked') {
                    el[property] = value;
                } else if (property === 'style.width') {
                    el.style.width = value;
                }
                else {
                    el.textContent = value || '';
                }
            }
        };

        // --- Populate fields from NLP data if available, otherwise use defaults ---
        const rec = nlpAnalysis?.recommended_actions;
        const dyn = nlpAnalysis?.conversation_dynamics;
        const sentiment = nlpAnalysis?.sentiment;
        const suggested = nlpAnalysis?.suggested_topics;
        const brain = nlpAnalysis?.conversation_brain;

        // Tune Panel
        setField('current-goal', rec?.suggestedNextAction || 'BUILD_RAPPORT', 'value');
        setField('focus-topic', rec?.focus_topic || 'auto', 'value');
        setField('flirt-level', rec?.tone || 30, 'value');
        setField('length', rec?.length || 50, 'value');
        setField('linguistic-style', rec?.linguisticStyle || 'casual', 'value');
        setField('emoji-strategy', rec?.emojiStrategy || 'auto', 'value');
        setField('escalate-flirtation', rec?.escalate_flirtation || false, 'checked');
        setField('creativity', brain?.predictive_actions?.creativity || 0.7, 'value');
        setField('focus', brain?.predictive_actions?.focus || 0.9, 'value');

        // Analysis Panel
        setField('analysis-date-arc', rec?.dateArcPhase || 'N/A');
        const tensionMap = { low: 25, medium: 50, high: 75 };
        setField('analysis-tension-bar', `${tensionMap[dyn?.flirtation_level] || 0}%`, 'style.width');
        setField('analysis-sentiment', sentiment?.overall || 'N/A');
        setField('analysis-stage', dyn?.stage || 'N/A');
        setField('analysis-reciprocity', dyn?.reciprocity_balance || 'N/A');
        setField('analysis-next-topic', suggested?.next_topic || '', 'value');
        setField('analysis-escalate-topic', suggested?.escalate_topic || '', 'value');
        setField('analysis-avoid-topic', suggested?.avoid_topic || '', 'value');

        // --- Populate fields directly from scraped data ---
        const geo = scrapedData?.geoContext || {}; // Use geoContext if present, otherwise empty object

        // Geo Panel (using scraped data)
        setField('geo-virtual', geo.isVirtual ? 'Yes' : 'No');
        setField('geo-user-location', geo.userLocation?.city || 'N/A');
        setField('geo-match-location', scrapedData?.matchLocation || 'N/A');
        setField('geo-user-time', geo.userLocation?.timeOfDay || 'N/A');
        setField('geo-match-time', geo.matchLocation?.timeOfDay || 'N/A');
        setField('geo-distance', Math.round(geo.distance_miles || scrapedData?.matchDistance || 0));
        setField('geo-time-diff', geo.timeZoneDifference || 'N/A');

        // Context Panel (using scraped data)
        if (scrapedData?.conversationHistory && scrapedData.conversationHistory.length > 0) {
            historyLog.innerHTML = scrapedData.conversationHistory
                .map(msg => `<li><span class="history-role">${msg.role === 'user' ? 'You' : scrapedData.theirName}:</span> <span class="history-content">${msg.content}</span></li>`)
                .join('');
        } else {
            historyLog.innerHTML = '<li>No conversation history found.</li>';
        }

        // Update all slider value displays
        sliders.forEach(updateSliderValue);

        // Show the raw scraped data in the debug output
        const debugPre = debugOutput.querySelector('pre code');
        if (debugPre) {
            debugPre.textContent = JSON.stringify({scrapedData, nlpAnalysis}, null, 2);
        }
    }

    async function loadAndPopulateUI() {
        try {
            const scrapedData = await fetchScrapedData();

            // Store the scraped data in the global `nlpData` variable.
            // In the future, this variable will hold the combined result of scraping and NLP analysis.
            nlpData = scrapedData;

            // Populate the UI. We pass the scraped data, and null for the NLP analysis part for now.
            populateUiWithNlpData(scrapedData, null);

            showView('main');
        } catch (error) {
            document.querySelector('#error-view .error-message').textContent = error.message;
            showView('error');
        }
    }

    const SETTINGS_KEY = 'wingmanAISettings';

    function getSettingsFromDOM() {
        return {
             config: {
                nlpUrl: document.getElementById('nlp-url').value,
                aiEndpoint: document.getElementById('ai-endpoint').value,
                openaiKey: document.getElementById('openai-key').value,
                openaiModel: document.getElementById('openai-model').value,
                advancedNlp: document.getElementById('advanced-nlp-toggle').checked,
                myProfile: document.getElementById('my-profile').value,
                myLocation: document.getElementById('my-location').value,
            }
        };
    }

    function saveSettings() {
        try {
            const settingsToSave = getSettingsFromDOM();
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
        } catch (e) { console.error("Error saving settings:", e); }
    }

    function loadSettings() {
        try {
            const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (savedSettings && savedSettings.config) {
                const config = savedSettings.config;
                document.getElementById('nlp-url').value = config.nlpUrl || '';
                document.getElementById('ai-endpoint').value = config.aiEndpoint || '';
                document.getElementById('openai-key').value = config.openaiKey || '';
                document.getElementById('openai-model').value = config.openaiModel || 'gpt-4-turbo';
                document.getElementById('advanced-nlp-toggle').checked = config.advancedNlp || false;
                document.getElementById('my-profile').value = config.myProfile || '';
                document.getElementById('my-location').value = config.myLocation || 'auto';
            }
        } catch (e) { console.error("Error loading settings:", e); }
    }

    function getMyLocation() {
        return new Promise((resolve) => {
            const locationSetting = document.getElementById('my-location').value;
            if (locationSetting !== 'auto') return resolve(locationSetting);
            if (!navigator.geolocation) return resolve("Not supported");
            navigator.geolocation.getCurrentPosition(
                (p) => resolve(`${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`),
                () => resolve("Permission denied"),
                { timeout: 5000 }
            );
        });
    }

    async function constructApiPayload() {
        const myLocation = await getMyLocation();
        const settings = getSettingsFromDOM();
        const tuneSettings = {
            currentGoal: document.getElementById('current-goal').value,
            focus_topic: document.getElementById('focus-topic').value,
            flirtLevel: document.getElementById('flirt-level').value,
            length: document.getElementById('length').value,
            linguisticStyle: document.getElementById('linguistic-style').value,
            emojiStrategy: document.getElementById('emoji-strategy').value,
            escalate_flirtation: document.getElementById('escalate-flirtation').checked,
            creativity: document.getElementById('creativity').value,
            focus: document.getElementById('focus').value,
        };

        // nlpData now holds the raw scraped data.
        // We will construct the payload using this.
        return {
            // A unique ID for the match will need to be generated or retrieved,
            // for now, we can combine names as a placeholder.
            matchId: `${nlpData?.myName}-${nlpData?.theirName}`,
            scraped_data: nlpData, // Pass the entire scraped data object.
            ui_settings: {
                useEnhancedNlp: settings.config.advancedNlp,
                myLocation: myLocation,
                myProfile: settings.config.myProfile,
                local_model_name: settings.config.openaiModel,
                ...tuneSettings
            }
        };
    }

    async function handleTestConnection(button) {
        const statusSpan = button.querySelector('.connection-status');
        if (!statusSpan) return;

        statusSpan.textContent = '...';
        statusSpan.style.color = 'var(--secondary-text)';

        const settings = getSettingsFromDOM().config;
        let isSuccess = false;
        let testUrl = '';
        let options = {};

        try {
            if (button.id === 'test-nlp-btn') {
                testUrl = settings.nlpUrl;
                if (!testUrl) throw new Error("NLP Service URL is not set.");
                // Simple GET request to the base URL
                options = { method: 'GET' };
            } else if (button.id === 'test-llm-btn') {
                testUrl = settings.aiEndpoint;
                if (!testUrl) throw new Error("AI Endpoint is not set.");
                if (!settings.openaiKey) throw new Error("API Key is not set.");
                // A common way to test an OpenAI-compatible endpoint is to list models.
                // We'll assume the endpoint is compatible.
                if (!testUrl.endsWith('/')) testUrl += '/';
                testUrl += 'models';
                options = {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${settings.openaiKey}` }
                };
            }

            const response = await fetch(testUrl, options);
            if (response.ok) {
                isSuccess = true;
            } else {
                 console.error(`Connection test failed for ${button.id} with status ${response.status}`);
            }
        } catch (error) {
            console.error(`Connection test failed for ${button.id}:`, error);
            isSuccess = false;
        } finally {
            statusSpan.textContent = isSuccess ? '✓' : '✗';
            statusSpan.style.color = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
            setTimeout(() => {
                statusSpan.textContent = '';
            }, 3000);
        }
    }

    function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const importedSettings = JSON.parse(event.target.result);
                    if (importedSettings.config) {
                        loadSettings(); // Apply the config part
                        saveSettings();
                        showToast("Settings imported!");
                    } else {
                        showToast("Invalid settings file.");
                    }
                } catch (err) { showToast("Error: Invalid settings file."); }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function handleExport() {
        const settingsString = JSON.stringify(getSettingsFromDOM(), null, 2);
        const blob = new Blob([settingsString], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `wingman-ai-settings-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        showToast("Settings exported.");
    }

    function handleReset() {
        if (confirm("Are you sure you want to reset all settings?")) {
            localStorage.removeItem(SETTINGS_KEY);
            loadSettings(); // re-load to apply defaults
            showToast("Settings have been reset.");
        }
    }

    function init() {
        setupEventListeners();
        loadSettings(); // Load user's saved API keys, etc. first
        setCopyCancelButtonState('copy');
        showView('loading');
        loadAndPopulateUI(); // Then load session-specific data
    }

    init();
});
