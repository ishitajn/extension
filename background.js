// background.js (Re-architected for Manifest V3 Robustness with Heartbeat)
import { generatePrompts } from './prompts.js';
import { DEFAULTS, USER_LOCATIONS } from './uiConfig.js';
import { transformAnalysis } from './dataTransformer.js';

const DEBUG = {
    log: (category, message, data = null) => console.log(`[WINGMAN-BG-${category.toUpperCase()}] ${message}`, data ?? ''),
    error: (category, message, error = null) => console.error(`[WINGMAN-BG-${category.toUpperCase()}-ERROR] ${message}`, error ?? ''),
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

async function generateCacheHash(history, profile) {
    if ((!history || history.length === 0) && !profile)
        return 'empty';
    const combinedString = JSON.stringify(history) + JSON.stringify(profile);
    const encoder = new TextEncoder();
    const data = encoder.encode(combinedString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

class MatchMemory {
    async _getMatchUUID(name, profile) {
        const safeName = name || 'unknown_name';
        const safeProfile = profile || 'no_profile';
        const identifier = `${safeName.trim()}-${safeProfile.trim().substring(0, 100)}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(identifier);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async getMatchProfile(uuid) {
        const key = `match_${uuid}`;
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
    }
    async saveMatchProfile(uuid, profileData) {
        const key = `match_${uuid}`;
        await chrome.storage.local.set({
            [key]: profileData
        });
    }
    createInitialProfile(scrapedData) {
        return {
            uuid: null,
            metadata: {
                theirName: scrapedData.theirName,
                theirProfile: scrapedData.theirProfile,
                matchLocation: scrapedData.matchLocation,
                firstSeen: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
            },
            memory: {
                dateArcPhase: 'rapport',
                topics: {},
                insideJokes: [],
                avoidedTopics: [],
                questionHistory: [],
                geoContextData: null,
                lastCacheHash: null,
            },
            conversationHistory: scrapedData.conversationHistory,
            analysis: null,
        };
    }
}
const memoryManager = new MatchMemory();

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Nominatim reverse geocode failed: ${response.status}`);
        const data = await response.json();
        const { city, town, village, county, state, country } = data.address;
        return city || town || village || county || state || country || 'Unknown Location';
    } catch (error) {
        DEBUG.error('REVERSE_GEOCODE', 'Failed to reverse geocode', error);
        return null;
    }
}

async function resolveUserLocation(locationChoice) {
    const defaultLocation = "Charlotte, NC, USA";
    if (locationChoice !== 'autodetect') {
        return USER_LOCATIONS[locationChoice]?.name || defaultLocation;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: false
            });
        });

        const { latitude, longitude } = position.coords;
        const cityName = await reverseGeocode(latitude, longitude);
        return cityName || defaultLocation;

    } catch (error) {
        DEBUG.error('GEOLOCATION', `Failed to auto-detect location: ${error.message}`, error);
        return defaultLocation;
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

        const responseText = await fetchLocalLlamaResponse(settings.local_llama_api_key, payload, settings, controller.signal);

        const currentState = await getGenerationState(uuid);
        if (currentState.generationId !== generationId) {
            DEBUG.log('AI', `Stale generation response ignored for ${uuid}.`);
            return;
        }

        const finalResponse = options.onSuccess ? options.onSuccess(responseText) : cleanAIResponse(responseText);

        await setGenerationState(uuid, { isGenerating: false, response: finalResponse, generationStartTime: null }, port);
        if (options.logData) {
            await performanceLogger.log({ ...options.logData, response: finalResponse });
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
        "getNlpAnalysis": async (request) => {
            try {
                DEBUG.log('NLP', 'Received getNlpAnalysis request', request.data);
                const {
                    scrapedData
                } = request.data;
                if (!scrapedData) throw new Error("getNlpAnalysis received no scrapedData.");

                const uuid = await memoryManager._getMatchUUID(scrapedData.theirName, scrapedData.theirProfile);
                let matchProfile = await memoryManager.getMatchProfile(uuid);

                if (!matchProfile) {
                    DEBUG.log('NLP', `No existing profile found for ${uuid}. Creating new one.`);
                    matchProfile = memoryManager.createInitialProfile(scrapedData);
                    matchProfile.uuid = uuid;
                }

                const newCacheHash = await generateCacheHash(scrapedData.conversationHistory, scrapedData.theirProfile);
                if (matchProfile.memory?.lastCacheHash === newCacheHash && matchProfile.analysis) {
                    DEBUG.log('NLP-CACHE', 'Cache HIT.', {
                        uuid
                    });
                    port.postMessage({
                        action: 'nlpAnalysisResponse',
                        matchProfile
                    });
                    return;
                }
                DEBUG.log('NLP-CACHE', 'Cache MISS. Running full analysis.', {
                    uuid
                });

                matchProfile.conversationHistory = scrapedData.conversationHistory;
                matchProfile.metadata.theirProfile = scrapedData.theirProfile;
                matchProfile.metadata.matchLocation = scrapedData.matchLocation;

                // ---- NEW: Call backend for NLP analysis ----
                const settings = await chrome.storage.local.get(DEFAULTS);
                const nlpUrl = settings.nlp_url; // No need for fallback, get() with DEFAULTS handles it.

                const myLocation = await resolveUserLocation(settings.userLocationChoice);

                const requestBody = {
                    matchId: uuid,
                    scraped_data: {
                        myName: scrapedData.myName,
                        theirName: scrapedData.theirName,
                        theirProfile: scrapedData.theirProfile,
                        theirLocationString: scrapedData.matchLocation,
                        conversationHistory: scrapedData.conversationHistory
                    },
                    ui_settings: {
                        myLocation: myLocation,
                        myProfile: settings.myProfile,
                        useEnhancedNlp: settings.useEnhancedNlp,
                        local_model_name: settings.local_model_name
                    }
                };

                const nlpResponse = await fetch(nlpUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!nlpResponse.ok) {
                    throw new Error(`NLP backend failed: ${nlpResponse.status} ${nlpResponse.statusText}`);
                }

                const analysisResult = await nlpResponse.json();
                // ---- END NEW ----

                matchProfile.analysis = transformAnalysis(analysisResult);
                matchProfile.memory.lastCacheHash = newCacheHash;
                matchProfile.metadata.lastUpdated = new Date().toISOString();

                await memoryManager.saveMatchProfile(uuid, matchProfile);
                DEBUG.log('NLP', 'Analysis complete. Sending response.', {
                    matchProfile
                });
                port.postMessage({
                    action: 'nlpAnalysisResponse',
                    matchProfile
                });
            } catch (error) {
                DEBUG.error('NLP', 'Analysis failed', error);
                port.postMessage({
                    action: 'nlpAnalysisResponse',
                    error: error.message
                });
            }
        },

        "getFinalPayload": async(request) => {
            try {
                const { uuid, taskInstructions, myProfile, forceIncludeGeoContext } = request.data;
                if (!uuid || !taskInstructions) {
                    throw new Error("getFinalPayload requires a UUID and taskInstructions.");
                }

                const matchProfile = await memoryManager.getMatchProfile(uuid);
                if (!matchProfile) {
                    throw new Error(`No match profile found for UUID: ${uuid}`);
                }

                const generationData = {
                    myName: taskInstructions.myName,
                    theirName: matchProfile.metadata.theirName,
                    myProfile: myProfile,
                    theirProfile: matchProfile.metadata.theirProfile,
                    conversationHistory: matchProfile.conversationHistory,
                    taskInstructions: taskInstructions,
                    geoContextData: matchProfile.memory.geoContextData,
                    forceIncludeGeoContext: forceIncludeGeoContext,
                    conversationAnalysis: matchProfile.analysis,
                };

                const finalPayload = buildFinalPayload(generationData);
                DEBUG.log('PAYLOAD', 'Final payload generated.', finalPayload);
                port.postMessage({
                    action: 'finalPayloadResponse',
                    payload: finalPayload,
                    logData: {
                        uuid,
                        analysis: matchProfile.analysis,
                        payload: finalPayload
                    }
                });
            } catch (error) {
                DEBUG.error('PAYLOAD', 'Build failed', error);
                port.postMessage({
                    action: 'finalPayloadResponse',
                    error: error.message
                });
            }
        },

        "getAIResponse": async(request) => {
            const { payload, generationId, uuid, logData } = request.data;
            DEBUG.log('AI', `Received getAIResponse request for UUID ${uuid}`, { generationId });
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

        "getAIDateIdea": async(request) => {
            const { uuid, generationId } = request.data;
            const matchProfile = await memoryManager.getMatchProfile(uuid);
            if (!matchProfile) {
                await setGenerationState(uuid, { isGenerating: false, error: 'Match profile not found.' }, port);
                return;
            }

            const { metadata, memory } = matchProfile;
            const systemPrompt = `You are a creative and thoughtful date planner. Your goal is to generate a single, unique, and compelling date idea based on the provided context about two people. The idea should be specific, actionable, and tailored to their personalities and shared interests. You must return the response in a valid JSON object with three keys: "title" (a short, catchy name for the date), "description" (a 2-3 sentence explanation of the date), and "reasoning" (a 1-2 sentence explanation of why this is a good idea for them specifically).`;
            const userPrompt = `Based on the following context, generate one unique date idea.

- **Their Name:** ${metadata.theirName}
- **Their Profile & Interests:** ${metadata.theirProfile}
- **Shared Conversation Topics:** ${Object.keys(memory.topics || {}).join(', ')}
- **Inside Jokes:** ${memory.insideJokes.join(', ')}
- **Geo-Context:** ${JSON.stringify(memory.geoContextData)}

Generate one date idea in the specified JSON format.`;

            const payload = {
                model: "llama3:latest",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
                temperature: 0.8,
                response_format: { type: "json_object" }
            };

            const options = {
                onSuccess: (responseText) => {
                    let idea;
                    try {
                        idea = JSON.parse(responseText);
                        if (!idea || typeof idea.title !== 'string' || typeof idea.description !== 'string' || typeof idea.reasoning !== 'string') {
                            throw new Error("AI returned invalid JSON structure for date idea.");
                        }
                    } catch (parseError) {
                        throw new Error(`AI response was not valid JSON. Raw: ${responseText.substring(0, 100)}...`);
                    }
                    return `Date Idea: ${idea.title}\n\n${idea.description}\n\n(Why it's a good idea: ${idea.reasoning})`;
                }
            };
            await handleAITask(uuid, generationId, payload, port, options);
        },

        "refineAIResponse": async(request) => {
            const { originalResponse, refinementType, uuid, generationId } = request.data;

            const systemPrompt = `You are a message editor. Your task is to rewrite a given message based on a specific instruction (e.g., "make it funnier", "make it shorter"). You must only return the rewritten message text, without any extra commentary, labels, or quotation marks.`;
            const userPrompt = `Rewrite the following message to be **${refinementType}**:

"${originalResponse}"`;

            const payload = {
                model: "llama3:latest",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
                temperature: 0.6,
            };

            await handleAITask(uuid, generationId, payload, port);
        }
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

function buildFinalPayload(data) {
    const { systemMessage, userMessage } = generatePrompts(data);
    return {
        model: data.taskInstructions.local_model_name,
        messages: [{
                role: "system",
                content: systemMessage
            }, {
                role: "user",
                content: userMessage
            }
        ],
        temperature: data.taskInstructions.temperature,
        top_p: data.taskInstructions.top_p
    };
}

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

async function fetchLocalLlamaResponse(apiKey, payload, settings, signal) {
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
            body: JSON.stringify(payload),
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
    if (payload.response_format?.type === "json_object") {
        return responseData.choices[0].message.content;
    }
    if (!responseData.choices?.[0]?.message?.content) {
        throw new Error('Local server returned an unexpected response format.');
    }

    return responseData.choices[0].message.content.trim();
}