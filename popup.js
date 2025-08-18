document.addEventListener('DOMContentLoaded', () => {
    // --- Element Caching ---
    const views = {
        loading: document.getElementById('loading-view'),
        error: document.getElementById('error-view'),
        main: document.getElementById('main-view'),
        settings: document.getElementById('settings-view'),
    };

    const buttons = {
        // Main View
        settingsBtn: document.getElementById('settings-btn'),
        generateBtn: document.getElementById('generate-btn'),
        copyBtn: document.getElementById('copy-btn'),
        cancelBtn: document.getElementById('cancel-btn'),
        resetMatchBtn: document.getElementById('reset-match-btn'),
        variationsBtn: document.getElementById('variations-btn'),
        // Settings View
        backToMainBtn: document.getElementById('back-to-main-btn'),
        importSettingsBtn: document.getElementById('import-settings-btn'),
        exportSettingsBtn: document.getElementById('export-settings-btn'),
        resetDefaultsBtn: document.getElementById('reset-defaults-btn'),
        // Error View
        retryBtn: document.getElementById('retry-btn'),
    };

    const tabs = {
        tune: document.getElementById('tab-tune'),
        analysis: document.getElementById('tab-analysis'),
        context: document.getElementById('tab-context'),
    };

    const tabPanels = {
        tune: document.getElementById('tune-panel'),
        analysis: document.getElementById('analysis-panel'),
        context: document.getElementById('context-panel'),
    };

    const responseArea = document.getElementById('response-area');
    const responsePlaceholder = document.getElementById('response-placeholder');
    const responseLoader = document.getElementById('response-loader');
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


    // --- State Management ---
    let activeView = 'loading';
    let isGenerating = false;
    let generationTimeout;
    let history = [];
    let stopwatchInterval;
    let stopwatchStartTime;


    // --- View Management ---
    function showView(viewId) {
        activeView = viewId;
        for (const id in views) {
            views[id].classList.remove('active');
        }
        if (views[viewId]) {
            views[viewId].classList.add('active');
            if (viewId === 'settings') {
                buttons.backToMainBtn.focus();
            } else if (viewId === 'main') {
                 responseArea.focus();
            }
        } else {
            console.error(`View with ID "${viewId}" not found.`);
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            const isMetaKey = e.metaKey || e.ctrlKey;
            if (e.key === 'Enter' && !e.target.matches('textarea, [contenteditable]')) {
                e.preventDefault();
                buttons.generateBtn.click();
            }
            if (e.key === 'Escape' && isGenerating) {
                e.preventDefault();
                buttons.cancelBtn.click();
            }
            if (isMetaKey && e.key === '/') {
                e.preventDefault();
                debugToggle.checked = !debugToggle.checked;
                debugToggle.dispatchEvent(new Event('change'));
            }
        });

        // Navigation
        buttons.settingsBtn.addEventListener('click', () => showView('settings'));
        buttons.backToMainBtn.addEventListener('click', () => showView('main'));
        buttons.retryBtn.addEventListener('click', () => {
            showView('loading');
            setTimeout(() => showView('main'), 1500);
        });

        // Main Actions
        buttons.generateBtn.addEventListener('click', handleGenerate);
        buttons.copyBtn.addEventListener('click', () => handleCopy(responseArea.textContent));
        buttons.cancelBtn.addEventListener('click', handleCancel);

        // Settings Actions
        document.getElementById('test-nlp-btn').addEventListener('click', (e) => handleTestConnection(e.currentTarget));
        document.getElementById('test-llm-btn').addEventListener('click', (e) => handleTestConnection(e.currentTarget));
        buttons.importSettingsBtn.addEventListener('click', handleImport);
        buttons.exportSettingsBtn.addEventListener('click', handleExport);
        buttons.resetDefaultsBtn.addEventListener('click', handleReset);

        // Tab Navigation
        Object.values(tabs).forEach(tab => {
            tab.addEventListener('click', (e) => handleTabClick(e.currentTarget));
        });

        // Interactive Controls
        responseArea.addEventListener('input', () => {
            responsePlaceholder.style.display = responseArea.textContent.trim() ? 'none' : 'block';
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
                const textToCopy = e.target.previousElementSibling.textContent;
                handleCopy(textToCopy);
            }
        });
        debugToggle.addEventListener('change', () => {
            debugOutput.style.display = debugToggle.checked ? 'block' : 'none';
        });
    }

    // --- Core Functions ---

    function handleTabClick(clickedTab) {
        if (!clickedTab) return;
        Object.values(tabs).forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        Object.values(tabPanels).forEach(panel => panel.classList.remove('active'));
        clickedTab.classList.add('active');
        clickedTab.setAttribute('aria-selected', 'true');
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
        stopwatchStartTime = Date.now();
        stopwatchInterval = setInterval(updateStopwatchDisplay, 100);
        updateStopwatchDisplay();

        const apiPayload = await constructApiPayload();
        console.log("--- Wingman AI: API Payload ---", JSON.stringify(apiPayload, null, 2));

        buttons.generateBtn.disabled = true;
        buttons.cancelBtn.style.display = 'inline-flex';
        buttons.variationsBtn.style.display = 'none';
        buttons.copyBtn.style.display = 'none';
        refinementActions.style.display = 'none';
        responseLoader.style.display = 'block';
        responsePlaceholder.style.display = 'none';
        responseArea.textContent = '';

        generationTimeout = setTimeout(() => {
            if (!isGenerating) return;
            isGenerating = false;

            clearInterval(stopwatchInterval);
            const finalTime = ((Date.now() - stopwatchStartTime) / 1000).toFixed(1);
            stopwatchDisplay.textContent = `${finalTime}s`;

            const dummyResponse = "This is a witty and engaging response generated by Wingman AI. How does this look?";
            responseArea.textContent = dummyResponse;

            history.unshift(dummyResponse);
            if (history.length > 5) history.pop();
            updateHistoryLog();

            const debugData = { request: apiPayload, response: { text: dummyResponse }, latency: `${finalTime}s` };
            debugOutput.querySelector('code').textContent = JSON.stringify(debugData, null, 2);

            buttons.generateBtn.disabled = false;
            buttons.cancelBtn.style.display = 'none';
            buttons.copyBtn.style.display = 'inline-flex';
            buttons.variationsBtn.style.display = 'inline-flex';
            refinementActions.style.display = 'flex';
            responseLoader.style.display = 'none';

            handleCopy(dummyResponse);
            saveSettings();
        }, 2500);
    }

    function handleCancel() {
        if (!isGenerating) return;
        isGenerating = false;
        clearTimeout(generationTimeout);
        clearInterval(stopwatchInterval);
        stopwatchStartTime = null;

        buttons.generateBtn.disabled = false;
        buttons.cancelBtn.style.display = 'none';
        buttons.copyBtn.style.display = 'inline-flex';
        responseLoader.style.display = 'none';

        if (!responseArea.textContent) {
            responsePlaceholder.style.display = 'block';
        }
        const savedSettings = JSON.parse(localStorage.getItem('wingmanAISettings') || '{}');
        if (savedSettings.config && savedSettings.config.lastResponseTime) {
            stopwatchDisplay.textContent = savedSettings.config.lastResponseTime;
        } else {
            stopwatchDisplay.textContent = '0.0s';
        }
    }

    function handleCopy(textToCopy) {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("Copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast("Failed to copy!");
        });
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

    // --- Settings & Persistence ---
    const SETTINGS_KEY = 'wingmanAISettings';

    function getSettingsFromDOM() {
        return {
            activeTab: document.querySelector('.tab-btn.active')?.id || 'tab-tune',
            tune: {
                currentGoal: document.getElementById('current-goal').value,
                flirtLevel: document.getElementById('flirt-level').value,
                lengthLevel: document.getElementById('length-level').value,
                linguisticStyle: document.getElementById('linguistic-style').value,
                creativity: document.getElementById('creativity').value,
                focus: document.getElementById('focus').value,
            },
            config: {
                nlpUrl: document.getElementById('nlp-url').value,
                aiEndpoint: document.getElementById('ai-endpoint').value,
                openaiKey: document.getElementById('openai-key').value,
                openaiModel: document.getElementById('openai-model').value,
                advancedNlp: document.getElementById('advanced-nlp-toggle').checked,
                myProfile: document.getElementById('my-profile').value,
                myLocation: document.getElementById('my-location').value,
                lastResponseTime: stopwatchDisplay.textContent
            }
        };
    }

    function applySettingsToDOM(settings) {
        if (!settings) return;
        if (settings.tune) {
            const tune = settings.tune;
            document.getElementById('current-goal').value = tune.currentGoal || 'Build Rapport';
            document.getElementById('flirt-level').value = tune.flirtLevel || 50;
            document.getElementById('length-level').value = tune.lengthLevel || 50;
            document.getElementById('linguistic-style').value = tune.linguisticStyle || 'Witty';
            document.getElementById('creativity').value = tune.creativity || 0.7;
            document.getElementById('focus').value = tune.focus || 0.9;
            sliders.forEach(updateSliderValue);
        }
        if (settings.config) {
            const config = settings.config;
            document.getElementById('nlp-url').value = config.nlpUrl || '';
            document.getElementById('ai-endpoint').value = config.aiEndpoint || '';
            document.getElementById('openai-key').value = config.openaiKey || '';
            document.getElementById('openai-model').value = config.openaiModel || 'gpt-4-turbo';
            document.getElementById('advanced-nlp-toggle').checked = config.advancedNlp || false;
            document.getElementById('my-profile').value = config.myProfile || '';
            document.getElementById('my-location').value = config.myLocation || 'auto';
            stopwatchDisplay.textContent = config.lastResponseTime || '0.0s';
        }
        if (settings.activeTab) {
            const tabToActivate = document.getElementById(settings.activeTab);
            if(tabToActivate) handleTabClick(tabToActivate);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(getSettingsFromDOM()));
        } catch (e) { console.error("Error saving settings:", e); }
    }

    function loadSettings() {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) applySettingsToDOM(JSON.parse(savedSettings));
            else sliders.forEach(updateSliderValue);
        } catch (e) { console.error("Error loading settings:", e); }
    }

    function getMyLocation() {
        return new Promise((resolve) => {
            const locationSetting = document.getElementById('my-location').value;
            if (locationSetting !== 'auto') {
                resolve(locationSetting);
                return;
            }
            if (!navigator.geolocation) {
                resolve("Geolocation not supported");
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`),
                () => resolve("Permission denied"),
                { timeout: 5000 }
            );
        });
    }

    async function constructApiPayload() {
        const settings = getSettingsFromDOM();
        const myLocation = await getMyLocation();
        return {
            matchId: "placeholder_match_id_12345",
            scraped_data: { /* ... placeholder ... */ },
            ui_settings: {
                useEnhancedNlp: settings.config.advancedNlp,
                myLocation: myLocation,
                myProfile: settings.config.myProfile,
                local_model_name: settings.config.openaiModel
            }
        };
    }

    function handleTestConnection(button) {
        const statusSpan = button.querySelector('.connection-status');
        if (!statusSpan) return;
        statusSpan.textContent = '...';
        setTimeout(() => {
            const isSuccess = Math.random() < 0.75;
            statusSpan.textContent = isSuccess ? '✓' : '✗';
            statusSpan.style.color = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
            setTimeout(() => statusSpan.textContent = '', 2000);
        }, 1000);
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
                    applySettingsToDOM(JSON.parse(event.target.result));
                    saveSettings();
                    showToast("Settings imported!");
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
            location.reload();
        }
    }

    // --- Initialization ---
    function init() {
        loadSettings();
        setupEventListeners();
        showView('loading');
        setTimeout(() => showView('main'), 1000);
    }

    init();
});
