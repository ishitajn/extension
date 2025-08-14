// background.js (Re-architected for Manifest V3 Robustness with Heartbeat)

// All from-scratch helpers are now obsolete as this logic is handled by the backend.

const DEBUG = {
    log: (category, message, data = null) => console.log(`[WINGMAN-BG-${category.toUpperCase()}] ${message}`, data ?? ''),
    error: (category, message, error = null) => console.error(`[WINGMAN-BG-${category.toUpperCase()}-ERROR] ${message}`, error ?? ''),
};

// --- NEW: Default configuration to prevent undefined settings ---
const DEFAULTS = {
    local_llama_url: 'http://localhost:8080/v1/chat/completions',
    local_model_name: 'llama3:latest',
    local_llama_api_key: '',
};

const abortControllers = new Map();

// --- NEW: Performance Logger ---
class PerformanceLogger {
    async log(logData) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                ...logData
            };
            const key = `perflog_${timestamp}`;
            await chrome.storage.local.set({
                [key]: logEntry
            });
            DEBUG.log('PERFLOG', 'Performance log saved.', key);
        } catch (e) {
            DEBUG.error('PERFLOG', 'Failed to save performance log.', e);
        }
    }
}
const performanceLogger = new PerformanceLogger();

const getGenerationStateKey = (uuid) => `generationState_${uuid}`;

async function getGenerationState(uuid) {
    if (!uuid)
        return {
            isGenerating: false,
            response: null,
            error: null,
            generationId: null,
            generationStartTime: null
        };
    const key = getGenerationStateKey(uuid);
    const result = await chrome.storage.local.get(key);
    return result[key] || {
        isGenerating: false,
        response: null,
        error: null,
        generationId: null,
        generationStartTime: null
    };
}

async function setGenerationState(uuid, newState, port) {
    if (!uuid)
        return;
    const key = getGenerationStateKey(uuid);
    const currentState = await getGenerationState(uuid);
    const updatedState = {
        ...currentState,
        ...newState
    };
    await chrome.storage.local.set({
        [key]: updatedState
    });
    DEBUG.log('STATE', `Set generation state for ${uuid}`, updatedState);
    if (port && port.postMessage) {
        try {
            port.postMessage({
                action: 'generationUpdate',
                uuid,
                state: updatedState
            });
        } catch (e) {
            DEBUG.error('PORT', 'Failed to post message, port may be disconnected.', e);
        }
    }
}


async function handleAITask(uuid, generationId, payload, port, options = {}) {
    if (abortControllers.has(uuid)) {
        abortControllers.get(uuid).abort("A new generation request was started.");
    }
    const controller = new AbortController();
    abortControllers.set(uuid, controller);

    await setGenerationState(uuid, { isGenerating: true, response: null, error: null, generationId, generationStartTime: Date.now() }, port);

    try {
        const storedSettings = await chrome.storage.local.get(Object.keys(DEFAULTS));
        const settings = { ...DEFAULTS, ...storedSettings };

        const { responseText, usage } = await fetchLocalLlamaResponse(settings.local_llama_api_key, payload, settings, controller.signal);

        const currentState = await getGenerationState(uuid);
        if (currentState.generationId !== generationId) {
            DEBUG.log('AI', `Stale generation response ignored for ${uuid}.`);
            return;
        }

        const finalResponse = options.onSuccess ? options.onSuccess(responseText) : cleanAIResponse(responseText);

        await setGenerationState(uuid, { isGenerating: false, response: finalResponse, generationStartTime: null, tokenCount: usage?.total_tokens }, port);
        if (options.logData) {
            await performanceLogger.log({ ...options.logData, response: finalResponse, usage });
        }

    } catch (error) {
        const currentState = await getGenerationState(uuid);
        if (currentState.generationId !== generationId) {
            DEBUG.log('AI', `Stale generation error ignored for ${uuid}.`);
            return;
        }

        if (error.name === 'AbortError') {
            DEBUG.log('AI', `Task for ${uuid} was cancelled by disconnect or new request. State already handled.`);
            return;
        }

        DEBUG.error('AI-TASK', `Task failed for ${uuid}`, error);
        await setGenerationState(uuid, { isGenerating: false, error: error.message, generationStartTime: null }, port);

    } finally {
        if (abortControllers.get(uuid) === controller) {
            abortControllers.delete(uuid);
        }
    }
}

chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "wingman-popup")
        return;

    DEBUG.log('PORT', 'Popup connected');

    const messageHandlers = {
       "generateFinalResponse": async(request) => {
            const { payload, generationId, uuid, logData } = request.data;
            DEBUG.log('AI', `Received generateFinalResponse request for UUID ${uuid}`, { generationId });
            if (!uuid || !payload) {
                DEBUG.error('AI', `Request for ${uuid} aborted due to empty payload.`);
                await setGenerationState(uuid, { isGenerating: false, error: 'Internal error: Payload was empty.' }, port);
                return;
            }
            await handleAITask(uuid, generationId, payload, port, { logData });
        },

        "cancelGeneration": async(request) => {
            const { uuid } = request.data;
            DEBUG.log('CANCEL', `Received cancel request for ${uuid}`);
            if (abortControllers.has(uuid)) {
                abortControllers.get(uuid).abort("Cancelled by user.");
                abortControllers.delete(uuid);
            }
            await setGenerationState(uuid, {
                isGenerating: false,
                error: 'Generation cancelled.',
                generationId: null,
                generationStartTime: null
            }, port);
        },

        "getGenerationState": async(request) => {
            const { uuid } = request.data;
            const state = await getGenerationState(uuid);
            DEBUG.log('STATE', `Received getGenerationState request for ${uuid}, returning state.`, state);
            port.postMessage({
                action: 'generationStateResponse',
                state
            });
        },

        "heartbeat": () => {
            DEBUG.log('HEARTBEAT', 'Received heartbeat.');
        },
    };

    port.onMessage.addListener((request) => {
        DEBUG.log('PORT', 'Message received from popup', request);
        const handler = messageHandlers[request.action];
        if (handler) {
            handler(request);
        } else {
            DEBUG.error('PORT', 'No handler found for action', request.action);
        }
    });

    port.onDisconnect.addListener(() => {
        DEBUG.log('PORT', 'Popup disconnected. Cleaning up all active tasks.');
        abortControllers.forEach((controller, uuid) => {
            DEBUG.log('PORT', `Aborting active generation for UUID: ${uuid} due to popup closure.`);
            controller.abort("Popup was closed.");
            setGenerationState(uuid, {
                isGenerating: false,
                error: 'Cancelled: Popup closed.',
                generationId: null,
                generationStartTime: null
            }, null);
        });
        abortControllers.clear();
    });
});

function cleanAIResponse(rawResponse) {
    if (typeof rawResponse !== 'string' || !rawResponse)
        return '';
    const stopTokens = ['<|im_end|>', '<|eot_id|>', '</s>', '[INST]', '---'];
    let earliestStopIndex = -1;
    for (const token of stopTokens) {
        const index = rawResponse.indexOf(token);
        if (index !== -1 && (earliestStopIndex === -1 || index < earliestStopIndex)) {
            earliestStopIndex = index;
        }
    }
    return (earliestStopIndex !== -1 ? rawResponse.substring(0, earliestStopIndex) : rawResponse).trim();
}

// --- Proactive Notification Logic ---

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('tinder.com/app/messages') || tab.url.includes('bumble.com/app/chat'))) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['observer.js']
        }).catch(err => console.error(`Failed to inject observer script: ${err}`));
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PROACTIVE_ANALYSIS_REQUEST') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Wingman AI',
            message: 'New message detected. Open Wingman to analyze the conversation!'
        });
    }
    // This listener must return true if it will respond asynchronously.
    // Since onConnect is used for the main logic, we can return false or undefined here.
});


async function fetchLocalLlamaResponse(apiKey, payload, settings, signal) {
    // Add `stream: false` to ensure we get usage data in the response
    const finalPayload = { ...payload, stream: false };

    const { local_llama_url } = settings;
    const headers = {
        "Content-Type": "application/json"
    };
    if (apiKey)
        headers["Authorization"] = `Bearer ${apiKey}`;

    let response;
    try {
        response = await fetch(local_llama_url, {
            method: "POST",
            headers,
            body: JSON.stringify(finalPayload),
            signal
        });
    } catch (error) {
        if (error.name === 'AbortError')
            throw error;
        throw new Error(`Network Error: Could not connect to the AI server at ${local_llama_url}.`);
    }

    if (!response.ok) {
        let errorBody = await response.text();
        let errorMessage = errorBody;
        try {
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.error?.message || errorJson.error || JSON.stringify(errorJson);
        } catch (e) { /* Not JSON */
        }
        throw new Error(`Local server error: ${response.status} - ${errorMessage}`);
    }

    const responseData = await response.json();
    const responseText = responseData.choices[0]?.message?.content || '';

    if (!responseText) {
         throw new Error('Local server returned an unexpected response format (missing content).');
    }

    return { responseText: responseText.trim(), usage: responseData.usage };
}
