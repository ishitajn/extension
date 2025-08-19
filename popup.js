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
    const ICONS = {
        COPY: `<svg class="icon" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
        CANCEL: `<svg class="icon danger" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`
    };

    let isGenerating = false;
    let nlpData = null;

    // --- View Management ---
    function showView(viewId) {
        Object.values(views).forEach(view => view.classList.remove('active'));
        if (views[viewId]) views[viewId].classList.add('active');
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
        Object.values(tabs).forEach(tab => {
            tab.addEventListener('click', (e) => handleTabClick(e.currentTarget));
        });
    }

    // --- UI Update Functions ---
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
        goalSelect.value = rec.suggestedNextAction;
        highlightSuggestion(goalSelect);

        const flirtSlider = document.getElementById('flirt-level');
        flirtSlider.value = dyn.flirtation_level === 'high' ? 75 : (dyn.flirtation_level === 'medium' ? 50 : 25);
        flirtSlider.parentElement.querySelector('.slider-value').textContent = flirtSlider.value;
        highlightSuggestion(flirtSlider.parentElement);

        document.getElementById('analysis-sentiment').textContent = data.sentiment.overall;
        document.getElementById('analysis-stage').textContent = dyn.stage;
    }

    // --- Core Logic ---
    async function fetchNlpAnalysis() {
        // In a real extension, this would scrape and then fetch.
        // We simulate it here.
        console.log("Simulating: Fetching NLP analysis...");
        await new Promise(resolve => setTimeout(resolve, 750));
        if (Math.random() < 0.1) throw new Error("Failed to analyze page content."); // 10% chance of failure
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
            // This is where the call to the LLM would happen, using the UI state
            console.log("Simulating: Calling LLM with current UI settings...");
            await new Promise(resolve => setTimeout(resolve, 1500));
            responseArea.textContent = "This is a new response from the LLM based on your tuned parameters.";
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
        // In this new flow, cancel simply stops the generation.
        isGenerating = false;
        // If there was a real fetch request, you would abort it here.
        handleGenerate(); // Re-enable buttons and clear loaders
    }

    function handleCopy(textToCopy) {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => showToast("Copied!"))
            .catch(() => showToast("Copy failed"));
    }

    // --- Initialization ---
    async function init() {
        setupEventListeners();
        setCopyCancelButtonState('copy');
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
