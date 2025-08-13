// --- On-Install Logic ---

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        console.log('[Background Script] Extension installed or updated. Fetching and caching UI options.');

        // Get the NLP URL from storage. Use a default if not set.
        const settings = await new Promise(resolve => chrome.storage.local.get({ nlpUrl: 'http://localhost:8000' }, resolve));
        const nlpUrl = settings.nlpUrl;

        try {
            const response = await fetch(`${nlpUrl}/api/v1/options/all`);
            if (!response.ok) {
                throw new Error(`Failed to fetch options, status: ${response.status}`);
            }
            const uiOptions = await response.json();
            await chrome.storage.local.set({ uiOptions });
            console.log('[Background Script] UI options fetched and cached successfully.');

        } catch (error) {
            console.error('[Background Script] Failed to fetch or cache UI options:', error);
            // Can't show a UI error here, but the popup will fail gracefully.
        }
    }
});


// --- Message Handling for LLM Generation ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GENERATE_TEXT') {
        const { prompts, settings } = message.payload;
        console.log('[Background Script] Received generation request.');

        // Immediately return true to indicate we will send a response asynchronously
        // This is crucial to prevent the message port from closing.
        (async () => {
            try {
                const response = await fetch(settings.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${settings.apiKey}`
                    },
                    body: JSON.stringify({
                        model: settings.modelName,
                        messages: [
                            { role: 'system', content: prompts.system_prompt },
                            { role: 'user', content: prompts.user_prompt }
                        ],
                        // Add other LLM params here if needed, e.g., temperature
                    })
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`LLM API Error: ${response.status} ${response.statusText} - ${errorBody}`);
                }

                const data = await response.json();
                // Assuming a standard chat completion response format
                const generatedText = data.choices[0]?.message?.content || "No response text found.";

                chrome.runtime.sendMessage({
                    type: 'GENERATION_COMPLETE',
                    payload: { text: generatedText }
                });

            } catch (error) {
                console.error('[Background Script] Error during LLM call:', error);
                chrome.runtime.sendMessage({
                    type: 'GENERATION_ERROR', // Send a different message type for errors
                    payload: { error: error.message }
                });
            }
        })();

        return true;
    } else if (message.type === 'PROACTIVE_ANALYSIS_REQUEST') {
        console.log('[Background Script] Received proactive analysis request.');
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png', // Assuming an icon exists at this path
            title: 'Wingman AI',
            message: 'New message detected. Open Wingman to analyze the conversation!'
        });
    }
});

console.log('[Background Script] Service worker started.');
