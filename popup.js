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
        backToMainBtn: document.getElementById('back-to-main-btn'),
        importSettingsBtn: document.getElementById('import-settings-btn'),
        exportSettingsBtn: document.getElementById('export-settings-btn'),
        resetDefaultsBtn: document.getElementById('reset-defaults-btn'),
        retryBtn: document.getElementById('retry-btn'),
    };
    const tabs = {
        tune: document.getElementById('tab-tune'),
        analysis: document.getElementById('tab-analysis'),
    };
    const tabPanels = {
        tune: document.getElementById('tune-panel'),
        analysis: document.getElementById('analysis-panel'),
    };
    const responseArea = document.getElementById('response-area');
    const responseLoader = document.getElementById('response-loader');
    const responseError = document.getElementById('response-error');
    const toast = document.getElementById('toast');
    const sliders = document.querySelectorAll('input[type="range"]');

    const ICONS = {
        COPY: `<svg class="icon" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
        CANCEL: `<svg class="icon danger" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`
    };

    let isGenerating = false;
    let nlpData = null;

    function showView(viewId) {
        Object.values(views).forEach(view => view.classList.remove('active'));
        if (views[viewId]) views[viewId].classList.add('active');
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
        sliders.forEach(slider => {
            slider.addEventListener('input', () => updateSliderValue(slider));
        });
    }

    function setCopyCancelButtonState(state) {
        buttons.copyCancelBtn.innerHTML = state === 'generating' ? ICONS.CANCEL : ICONS.COPY;
        buttons.copyCancelBtn.setAttribute('aria-label', state === 'generating' ? 'Cancel' : 'Copy');
    }

    function handleTabClick(clickedTab) {
        if (!clickedTab) return;
        Object.values(tabs).forEach(tab => tab.classList.remove('active'));
        Object.values(tabPanels).forEach(panel => panel.classList.remove('active'));
        clickedTab.classList.add('active');
        document.getElementById(clickedTab.getAttribute('aria-controls'))?.classList.add('active');
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function highlightSuggestion(element) {
        element.classList.add('highlight-suggestion');
        setTimeout(() => element.classList.remove('highlight-suggestion'), 1500);
    }

    function populateUiWithNlpData(data) {
        const rec = data.recommended_actions;
        const dyn = data.conversation_dynamics;
        const goalSelect = document.getElementById('current-goal');
        goalSelect.innerHTML = `<option selected>${rec.suggestedNextAction}</option>`;
        highlightSuggestion(goalSelect);
        const flirtSlider = document.getElementById('flirt-level');
        const tensionMap = { low: 25, medium: 50, high: 75 };
        flirtSlider.value = tensionMap[dyn.flirtation_level] || 50;
        updateSliderValue(flirtSlider);
        highlightSuggestion(flirtSlider.parentElement);
        document.getElementById('analysis-sentiment').textContent = data.sentiment.overall;
        document.getElementById('analysis-stage').textContent = dyn.stage;
    }

    function updateSliderValue(slider) {
        const valueLabel = slider.parentElement.querySelector('.slider-value');
        if (valueLabel) valueLabel.textContent = slider.value;
    }

    async function fetchNlpAnalysis() {
        await new Promise(resolve => setTimeout(resolve, 750));
        if (Math.random() < 0.1) throw new Error("Failed to analyze page.");
        return {"sentiment":{"overall":"positive"},"conversation_dynamics":{"stage":"active","flirtation_level":"medium"},"recommended_actions":{"suggestedNextAction":"PLAN_DATE"}};
    }

    async function handleGenerate() {
        if (isGenerating) return;
        isGenerating = true;
        setCopyCancelButtonState('generating');
        buttons.generateBtn.disabled = true;
        responseLoader.style.display = 'block';
        responseError.textContent = '';
        responseArea.textContent = '';

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            responseArea.textContent = "This is a new response from the LLM.";
            handleCopy(responseArea.textContent);
        } catch (error) {
            responseError.textContent = `Error: ${error.message}`;
        } finally {
            isGenerating = false;
            setCopyCancelButtonState('copy');
            buttons.generateBtn.disabled = false;
            responseLoader.style.display = 'none';
        }
    }

    function handleCancel() {
        isGenerating = false;
        // In a real app, abort the fetch request. Here, we just reset the UI.
        setCopyCancelButtonState('copy');
        buttons.generateBtn.disabled = false;
        responseLoader.style.display = 'none';
    }

    function handleCopy(textToCopy) {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => showToast("Copied!"))
            .catch(() => showToast("Copy failed"));
    }

    const SETTINGS_KEY = 'wingmanAISettings_v2';
    function saveSettings() {
        const settings = {
            nlpUrl: document.getElementById('nlp-url').value,
            aiEndpoint: document.getElementById('ai-endpoint').value,
            openaiKey: document.getElementById('openai-key').value,
            myProfile: document.getElementById('my-profile').value,
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadSettings() {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        document.getElementById('nlp-url').value = saved.nlpUrl || '';
        document.getElementById('ai-endpoint').value = saved.aiEndpoint || '';
        document.getElementById('openai-key').value = saved.openaiKey || '';
        document.getElementById('my-profile').value = saved.myProfile || '';
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

    function handleImport() { /* Stubbed for brevity */ }
    function handleExport() { /* Stubbed for brevity */ }
    function handleReset() { /* Stubbed for brevity */ }

    async function init() {
        setupEventListeners();
        setCopyCancelButtonState('copy');
        loadSettings();
        showView('loading');
        try {
            nlpData = await fetchNlpAnalysis();
            populateUiWithNlpData(nlpData);
            showView('main');
        } catch (error) {
            document.querySelector('#error-view .error-message').textContent = error.message;
            showView('error');
        }
    }

    init();
});
