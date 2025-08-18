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
        // Settings View
        backToMainBtn: document.getElementById('back-to-main-btn'),
        testConnectionBtn: document.getElementById('test-connection-btn'),
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
    const variationsBtn = document.getElementById('variations-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Interactive Controls
    const sliders = document.querySelectorAll('input[type="range"]');
    const customInstruction = document.getElementById('custom-instruction');
    const clearCustomInstructionBtn = document.getElementById('clear-custom-instruction');
    const applySuggestionBtn = document.getElementById('apply-suggestion-btn');
    const suggestedActionText = document.getElementById('suggested-action-text');

    // Advanced Features
    const historyLog = document.getElementById('history-log');
    const debugToggle = document.getElementById('debug-toggle');
    const debugOutput = document.getElementById('debug-output');
    const timerDisplay = document.getElementById('timer-display');
    const timerProgress = document.getElementById('timer-progress');
    const resetTimerBtn = document.getElementById('reset-timer-btn');


    // --- Response Area Placeholder Logic ---
    responseArea.addEventListener('input', () => {
        // Hide placeholder if there's text, show it if empty
        responsePlaceholder.style.display = responseArea.textContent.trim() ? 'none' : 'block';
    });
    // --- State Management ---
    let activeView = 'loading';

    // --- View Management ---
    /**
     * Hides all views and shows the one with the specified ID.
     * @param {string} viewId - The ID of the view to show ('loading', 'error', 'main', 'settings').
     */
    function showView(viewId) {
        activeView = viewId;
        for (const id in views) {
            views[id].classList.remove('active');
        }
        if (views[viewId]) {
            views[viewId].classList.add('active');
            // Move focus to a logical element in the new view
            if (viewId === 'settings') {
                buttons.backToMainBtn.focus();
            } else if (viewId === 'main') {
                 responseArea.focus();
            }
        } else {
            console.error(`View with ID "${viewId}" not found.`);
        }
    }

    // --- Event Listener Setup ---

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
            // Manually trigger change event to update UI
            debugToggle.dispatchEvent(new Event('change'));
        }
    });

    // Navigation
    buttons.settingsBtn.addEventListener('click', () => showView('settings'));
    buttons.backToMainBtn.addEventListener('click', () => showView('main'));
    buttons.retryBtn.addEventListener('click', () => {
        // Simulate a retry attempt
        showView('loading');
        setTimeout(() => showView('main'), 1500);
    });

    // Tab Navigation
    Object.values(tabs).forEach(tab => {
        tab.addEventListener('click', (e) => handleTabClick(e.currentTarget));
    });

    // Action Buttons (stubs)
    buttons.generateBtn.addEventListener('click', handleGenerate);
    buttons.copyBtn.addEventListener('click', handleCopy);
    buttons.cancelBtn.addEventListener('click', handleCancel);

    // Settings Buttons (stubs)
    buttons.testConnectionBtn.addEventListener('click', handleTestConnection);
    buttons.importSettingsBtn.addEventListener('click', handleImport);
    buttons.exportSettingsBtn.addEventListener('click', handleExport);
    buttons.resetDefaultsBtn.addEventListener('click', handleReset);

    // --- Interactive Controls Logic & Settings Saving ---

    function updateSliderValue(slider) {
        const valueLabel = slider.previousElementSibling.querySelector('.slider-value');
        if (valueLabel) {
            valueLabel.textContent = slider.value;
        }
        // Announce the value for screen readers
        slider.setAttribute('aria-valuetext', slider.value);
    }

    // Listen for changes on all relevant forms and controls to save settings
    const settingsForm = document.getElementById('settings-form');
    const tunePanel = document.getElementById('tune-panel');

    settingsForm.addEventListener('change', saveSettings);
    tunePanel.addEventListener('change', saveSettings);
    sliders.forEach(slider => {
        slider.addEventListener('input', () => {
            updateSliderValue(slider);
            saveSettings();
        });
    });


    // --- Non-persisted Interactive Controls ---

    // Custom Instruction Textarea
    customInstruction.addEventListener('input', () => {
        clearCustomInstructionBtn.style.display = customInstruction.value ? 'block' : 'none';
    });

    clearCustomInstructionBtn.addEventListener('click', () => {
        customInstruction.value = '';
        customInstruction.focus();
        // Manually trigger input event to hide the button
        customInstruction.dispatchEvent(new Event('input'));
    });

    // Analysis Panel "Apply Suggestion" Button
    applySuggestionBtn.addEventListener('click', () => {
        const suggestion = suggestedActionText.textContent;
        if (suggestion) {
            customInstruction.value = suggestion;
            customInstruction.focus();
            // Ensure the view is updated (e.g., clear button visibility)
            customInstruction.dispatchEvent(new Event('input'));
            showToast("Suggestion applied!");
        }
    });


    // --- Function Stubs for Future Implementation ---

    function handleTabClick(clickedTab) {
        if (!clickedTab) return;

        // Deactivate all tabs and panels
        Object.values(tabs).forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        Object.values(tabPanels).forEach(panel => {
            panel.classList.remove('active');
        });

        // Activate the clicked tab
        clickedTab.classList.add('active');
        clickedTab.setAttribute('aria-selected', 'true');

        // Activate the corresponding panel
        const panelId = clickedTab.getAttribute('aria-controls');
        const correspondingPanel = document.getElementById(panelId);
        if (correspondingPanel) {
            correspondingPanel.classList.add('active');
        }
        saveSettings(); // Save the new active tab state
    }

    let isGenerating = false;
    let generationTimeout;
    let history = [];

    function updateHistoryLog() {
        historyLog.innerHTML = ''; // Clear existing list
        if (history.length === 0) {
            historyLog.innerHTML = '<li>No generations yet.</li>';
            return;
        }
        history.forEach(item => {
            const li = document.createElement('li');
            const text = document.createElement('span');
            text.className = 'history-text';
            text.textContent = item;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-sm copy-history-btn';
            copyBtn.textContent = 'Copy';
            li.appendChild(text);
            li.appendChild(copyBtn);
            historyLog.appendChild(li);
        });
    }

    // Use event delegation for history copy buttons
    historyLog.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-history-btn')) {
            const textToCopy = e.target.previousElementSibling.textContent;
            handleCopy(textToCopy);
        }
    });

    // Debug Toggle Logic
    debugToggle.addEventListener('change', () => {
        debugOutput.style.display = debugToggle.checked ? 'block' : 'none';
    });

    // --- Timer Logic ---
    let timerInterval;
    let timerRemaining; // in seconds
    let timerTotalDuration; // in seconds

    function formatTime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds)) seconds = 0;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    function updateTimer() {
        timerRemaining--;
        timerDisplay.textContent = formatTime(timerRemaining);
        const progressPercent = Math.max(0, (timerRemaining / timerTotalDuration) * 100);
        timerProgress.style.width = `${progressPercent}%`;

        if (timerRemaining <= 0) {
            clearInterval(timerInterval);
            showToast("Timer finished!");
        }
    }

    function startTimer(durationInMinutes) {
        clearInterval(timerInterval);
        timerTotalDuration = durationInMinutes * 60;
        timerRemaining = timerTotalDuration;
        timerDisplay.textContent = formatTime(timerRemaining);
        timerProgress.style.width = '100%';
        timerInterval = setInterval(updateTimer, 1000);
    }

    function resetTimer() {
        const settings = getSettingsFromDOM();
        startTimer(settings.config.timerDefault);
    }

    resetTimerBtn.addEventListener('click', resetTimer);


    function handleGenerate() {
        if (isGenerating) return;

        // Start the timer
        resetTimer();

        isGenerating = true;

        // Update UI for loading state
        buttons.generateBtn.disabled = true;
        buttons.cancelBtn.style.display = 'inline-flex';
        buttons.variationsBtn.style.display = 'none';
        buttons.copyBtn.style.display = 'none';
        refinementActions.style.display = 'none';
        responseLoader.style.display = 'block';
        responsePlaceholder.style.display = 'none';
        responseArea.textContent = '';


        // Simulate API call
        generationTimeout = setTimeout(() => {
            if (!isGenerating) return; // Check if cancelled
            isGenerating = false;

            const dummyResponse = "This is a witty and engaging response generated by Wingman AI. How does this look?";
            responseArea.textContent = dummyResponse;

            // Add to history
            history.unshift(dummyResponse);
            if (history.length > 5) history.pop(); // Keep last 5
            updateHistoryLog();

            // Update debug output
            const debugData = {
                request: getSettingsFromDOM(),
                response: {
                    text: dummyResponse,
                },
                latency: '2500ms'
            };
            debugOutput.querySelector('code').textContent = JSON.stringify(debugData, null, 2);

            // Update UI for success state
            buttons.generateBtn.disabled = false;
            buttons.cancelBtn.style.display = 'none';
            buttons.copyBtn.style.display = 'inline-flex';
            buttons.variationsBtn.style.display = 'inline-flex';
            refinementActions.style.display = 'flex';
            responseLoader.style.display = 'none';

            handleCopy(dummyResponse); // Auto-copy response
        }, 2500); // 2.5 second simulated generation time
    }

    function handleCopy(textToCopy) {
        // The click event listener on the copy button passes an event object, not a string.
        // We check if textToCopy is a string; if not, we get the text from the response area.
        const text = (typeof textToCopy === 'string') ? textToCopy : responseArea.textContent;
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            showToast("Copied to clipboard!");
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast("Failed to copy!");
        });
    }

    function handleCancel() {
        if (!isGenerating) return;
        isGenerating = false;
        clearTimeout(generationTimeout);

        // Reset UI to default state
        buttons.generateBtn.disabled = false;
        buttons.cancelBtn.style.display = 'none';
        buttons.copyBtn.style.display = 'inline-flex'; // Show copy button again
        responseLoader.style.display = 'none';

        if (!responseArea.textContent) {
            responsePlaceholder.style.display = 'block';
        }
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    function handleTestConnection() {
        const statusSpan = document.getElementById('connection-status');
        if (!statusSpan) return;

        statusSpan.textContent = 'Testing...';
        statusSpan.style.color = 'var(--secondary-text)';

        // Simulate API call
        setTimeout(() => {
            // Simulate a 75% chance of success
            const isSuccess = Math.random() < 0.75;
            if (isSuccess) {
                statusSpan.textContent = 'Success!';
                statusSpan.style.color = 'var(--success-color)';
            } else {
                statusSpan.textContent = 'Failed!';
                statusSpan.style.color = 'var(--danger-color)';
            }
             // Clear the message after a few seconds
            setTimeout(() => {
                statusSpan.textContent = '';
            }, 3000);
        }, 1500);
    }

    function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedSettings = JSON.parse(event.target.result);
                    applySettingsToDOM(importedSettings);
                    saveSettings(); // Persist the newly imported settings
                    showToast("Settings imported successfully!");
                } catch (err) {
                    console.error("Error parsing imported settings file:", err);
                    showToast("Error: Invalid settings file.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function handleExport() {
        const settingsString = JSON.stringify(getSettingsFromDOM(), null, 2);
        const blob = new Blob([settingsString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wingman-ai-settings-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Settings exported.");
    }

    function handleReset() {
        if (confirm("Are you sure you want to reset all settings to their defaults? This cannot be undone.")) {
            // Clear from localStorage
            localStorage.removeItem(SETTINGS_KEY);
            // Reload the popup to apply default state.
            // This is a simple and effective way to reset the UI to its initial state.
            location.reload();
        }
    }

    // --- Settings & State Persistence ---
    const SETTINGS_KEY = 'wingmanAISettings';

    // Helper to get all form values into a settings object
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
                openaiKey: document.getElementById('openai-key').value,
                openaiModel: document.getElementById('openai-model').value,
                advancedNlp: document.getElementById('advanced-nlp-toggle').checked,
                myProfile: document.getElementById('my-profile').value,
                timerDefault: document.getElementById('timer-default').value,
            }
        };
    }

    // Helper to apply a settings object to the DOM
    function applySettingsToDOM(settings) {
        if (!settings) return;

        // Apply Tune Panel Settings
        if (settings.tune) {
            const tune = settings.tune;
            document.getElementById('current-goal').value = tune.currentGoal || 'Build Rapport';
            document.getElementById('flirt-level').value = tune.flirtLevel || 50;
            document.getElementById('length-level').value = tune.lengthLevel || 50;
            document.getElementById('linguistic-style').value = tune.linguisticStyle || '';
            document.getElementById('creativity').value = tune.creativity || 0.7;
            document.getElementById('focus').value = tune.focus || 0.9;
            // Update slider value displays after setting their values
            sliders.forEach(updateSliderValue);
        }

        // Apply Config Settings
        if (settings.config) {
            const config = settings.config;
            document.getElementById('nlp-url').value = config.nlpUrl || '';
            document.getElementById('openai-key').value = config.openaiKey || '';
            document.getElementById('openai-model').value = config.openaiModel || 'gpt-4-turbo';
            document.getElementById('advanced-nlp-toggle').checked = config.advancedNlp || false;
            document.getElementById('my-profile').value = config.myProfile || '';
            const timerDefault = config.timerDefault || 10;
            document.getElementById('timer-default').value = timerDefault;
            // Set the initial display of the timer without starting it
            if (!timerInterval) { // Only set if timer isn't already running
                 timerDisplay.textContent = formatTime(timerDefault * 60);
            }
        }

        // Apply Active Tab
        if (settings.activeTab) {
            const tabToActivate = document.getElementById(settings.activeTab);
            if(tabToActivate) handleTabClick(tabToActivate);
        }
    }

    function saveSettings() {
        const currentSettings = getSettingsFromDOM();
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
        } catch (e) {
            console.error("Error saving settings:", e);
        }
    }

    function loadSettings() {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
                applySettingsToDOM(JSON.parse(savedSettings));
            } else {
                // If no saved settings, ensure sliders display their default values
                sliders.forEach(updateSliderValue);
            }
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    }


    // --- Initialization ---
    function init() {
        loadSettings(); // Load settings from localStorage first
        // Start with the loading view
        showView('loading');

        // Simulate initial loading process (e.g., scraping the page)
        setTimeout(() => {
            // After loading, switch to the main view
            showView('main');
        }, 1500); // 1.5 second simulated load time
    }

    // Run the app
    init();
});
