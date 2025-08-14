// --- On-Install Logic ---
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        console.log('[Wingman AI] Extension installed/updated. Popup will fetch options if needed.');
        // The logic to fetch options is now primarily in the popup for robustness.
        // We could pre-cache here, but letting the popup handle it avoids issues
        // where the user hasn't configured the NLP URL yet.
        const settings = await new Promise(resolve => chrome.storage.local.get({ nlpUrl: null }, resolve));
        if (settings.nlpUrl) {
            try {
                const response = await fetch(`${settings.nlpUrl}/api/v1/options/all`);
                if (response.ok) {
                    const uiOptions = await response.json();
                    await chrome.storage.local.set({ uiOptions });
                    console.log('[Wingman AI] Pre-cached UI options successfully.');
                }
            } catch (e) {
                console.warn("Pre-caching options failed. The popup will try again.", e);
            }
        }
    }
});

// --- Tab Update Listener for Observer Injection ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('tinder.com') || tab.url.includes('bumble.com'))) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['observer.js']
        }).catch(err => console.error(`Failed to inject observer script: ${err}`));
    }
});

// --- Message Handling for LLM Generation & Proactive Notifications ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GENERATE_TEXT') {
        const { prompts, settings } = message.payload;
        (async () => {
            try {
                const response = await fetch(settings.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
                    body: JSON.stringify({
                        model: settings.modelName,
                        messages: [
                            { role: 'system', content: prompts.system_prompt },
                            { role: 'user', content: prompts.user_prompt }
                        ],
                    })
                });
                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`LLM API Error: ${response.status} - ${errorBody}`);
                }
                const data = await response.json();
                const generatedText = data.choices[0]?.message?.content || "No response text found.";
                chrome.runtime.sendMessage({ type: 'GENERATION_COMPLETE', payload: { text: generatedText } });
            } catch (error) {
                chrome.runtime.sendMessage({ type: 'GENERATION_ERROR', payload: { error: error.message } });
            }
        })();
        return true;
    } else if (message.type === 'PROACTIVE_ANALYSIS_REQUEST') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Wingman AI',
            message: 'New message detected. Open Wingman to analyze the conversation!'
        });
    }
});
