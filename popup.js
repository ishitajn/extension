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
            const apiPayload = await constructApiPayload();
            console.log("--- Wingman AI: API Payload for LLM ---", JSON.stringify(apiPayload, null, 2));
            const dummyResponse = await new Promise(resolve => setTimeout(() => resolve("This is a final, production-ready, AI-generated response."), 1500));
            responseArea.textContent = dummyResponse;
            handleCopy(dummyResponse);
        } catch (error) {
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

    async function fetchNlpAnalysis() {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {"sentiment":{"overall":"positive"},"topics":{"liked":["travel","food"],"disliked":[],"neutral":[],"sensitive":["flirt"],"map":{"travel":["travel","adventure"],"food":["foodie","italian"],"flirt":["cute","gorgeous smile"]}},"suggested_topics":{"next_topic":"career goals","avoid_topic":"flirt","escalate_topic":"sexual chemistry"},"conversation_dynamics":{"pace":"fast","stage":"active","reciprocity_balance":"balanced","flirtation_level":"medium"},"geoContext":{"userLocation":{"city":"New York","timeOfDay":"Morning"},"matchLocation":{"city":"San Francisco","timeOfDay":"Morning"},"distance_miles":2565.59,"timeZoneDifference":3,"isVirtual":true},"recommended_actions":{"focus_topic":"sexual","escalate_flirtation":true,"length":60,"tone":75,"linguisticStyle":"casual","emojiStrategy":"auto","suggestedNextAction":"PLAN_DATE","dateArcPhase":"escalation"},"conversation_brain":{"predictive_actions":{"creativity":0.7,"focus":0.9},"memory_layer":{"recent_topics":["travel","food","flirt"]}}};
    }

    function populateUiWithNlpData(data) {
        const rec = data.recommended_actions;
        const dyn = data.conversation_dynamics;

        document.getElementById('current-goal').innerHTML = `<option selected>${rec.suggestedNextAction}</option>`;
        document.getElementById('focus-topic').innerHTML = `<option selected>${rec.focus_topic}</option>`;
        document.getElementById('flirt-level').value = rec.tone;
        document.getElementById('length').value = rec.length;
        document.getElementById('linguistic-style').innerHTML = `<option selected>${rec.linguisticStyle}</option>`;
        document.getElementById('emoji-strategy').innerHTML = `<option selected>${rec.emojiStrategy}</option>`;
        document.getElementById('escalate-flirtation').checked = rec.escalate_flirtation;
        document.getElementById('creativity').value = data.conversation_brain.predictive_actions.creativity;
        document.getElementById('focus').value = data.conversation_brain.predictive_actions.focus;

        document.getElementById('analysis-date-arc').textContent = rec.dateArcPhase;
        const tensionMap = { low: 25, medium: 50, high: 75 };
        document.getElementById('analysis-tension-bar').style.width = `${tensionMap[dyn.flirtation_level] || 0}%`;
        document.getElementById('analysis-sentiment').textContent = data.sentiment.overall;
        document.getElementById('analysis-stage').textContent = dyn.stage;
        document.getElementById('analysis-reciprocity').textContent = dyn.reciprocity_balance;
        document.getElementById('analysis-next-topic').value = data.suggested_topics.next_topic;
        document.getElementById('analysis-escalate-topic').value = data.suggested_topics.escalate_topic;
        document.getElementById('analysis-avoid-topic').value = data.suggested_topics.avoid_topic;

        const geo = data.geoContext;
        document.getElementById('geo-virtual').textContent = geo.isVirtual ? 'Yes' : 'No';
        document.getElementById('geo-user-location').textContent = geo.userLocation.city;
        document.getElementById('geo-match-location').textContent = geo.matchLocation.city;
        document.getElementById('geo-user-time').textContent = geo.userLocation.timeOfDay;
        document.getElementById('geo-match-time').textContent = geo.matchLocation.timeOfDay;
        document.getElementById('geo-distance').textContent = Math.round(geo.distance_miles);
        document.getElementById('geo-time-diff').textContent = geo.timeZoneDifference;

        const topics = data.conversation_brain.memory_layer.recent_topics;
        historyLog.innerHTML = topics.map(t => `<li>${t}</li>`).join('');

        sliders.forEach(updateSliderValue);
    }

    async function loadAndPopulateUI() {
        try {
            nlpData = await fetchNlpAnalysis();
            populateUiWithNlpData(nlpData);
            showView('main');
        } catch (error) {
            document.querySelector('#error-view .error-message').textContent = error.message;
            showView('error');
        }
    }

    const SETTINGS_KEY = 'wingmanAISettings';
    function saveSettings() { /* Not implemented in this version */ }
    function loadSettings() { /* Not implemented in this version */ }

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
        // In this version, we read directly from the UI controls
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

        return {
            matchId: nlpData?.matchId || "placeholder_match_id",
            scraped_data: nlpData?.scraped_data || {},
            ui_settings: {
                useEnhancedNlp: document.getElementById('advanced-nlp-toggle').checked,
                myLocation: myLocation,
                myProfile: document.getElementById('my-profile').value,
                local_model_name: document.getElementById('openai-model').value,
                ...tuneSettings
            }
        };
    }

    function handleTestConnection(button) { /* Not relevant to this flow */ }
    function handleImport() { /* Not relevant to this flow */ }
    function handleExport() { /* Not relevant to this flow */ }
    function handleReset() { /* Not relevant to this flow */ }

    function init() {
        setupEventListeners();
        setCopyCancelButtonState('copy');
        showView('loading');
        loadAndPopulateUI();
    }

    init();
});
