// --- On-Install Logic ---
// REMOVED: The onInstalled logic was flawed as it relied on a potentially
// unconfigured user setting. The logic to fetch options if they are missing
// is now handled correctly in the popup script.
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Wingman AI] Extension installed/updated. Popup will handle option fetching on first open.');
});

// --- Tab Update Listener for Observer Injection ---
// This ensures the observer is injected only once when the tab is updated to a supported URL.
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
