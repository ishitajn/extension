/**
 * @file dataTransformer.js
 * @description Transforms the new backend analysis response into the legacy format expected by the UI.
 */

/**
 * Safely gets a nested value from an object.
 * @param {object} obj The object to query.
 * @param {string} path The dot-separated path to the property.
 * @param {*} defaultValue The default value to return if the path is not found.
 * @returns {*} The value at the path or the default value.
 */
function safeGet(obj, path, defaultValue = null) {
    const value = path.split('.').reduce((p, c) => (p && p[c] != null) ? p[c] : null, obj);
    return value !== null ? value : defaultValue;
}


/**
 * Transforms the new backend analysis response into the legacy format.
 * @param {object} newResponse The raw response from the backend.
 * @returns {object} The transformed analysis object.
 */
export function transformAnalysis(newResponse) {
    if (!newResponse) {
        return {}; // Return empty object if response is null
    }

    const conversationSummary = safeGet(newResponse, 'conversation_summary', {});
    const lastMessage = safeGet(newResponse, 'last_message', {});
    const recommendedActions = safeGet(newResponse, 'recommended_actions', {});
    const memorySummary = safeGet(newResponse, 'memory_summary', {});

    const transformed = {
        // Top-level properties
        conversationState: safeGet(conversationSummary, 'conversationState', 'ACTIVE_CONVO'),
        suppressGreeting: safeGet(conversationSummary, 'has_recent_greeting', false),
        geoContext: safeGet(newResponse, 'geoContext', null),

        // lastMessageAnalysis object
        lastMessageAnalysis: {
            isDirectQuestion: safeGet(lastMessage, 'isQuestion', false),
            isGeoRelated: safeGet(lastMessage, 'isGeoRelated', false),
            // The new `intent` is a string, the old `intents` was an array.
            intents: lastMessage.intent ? [lastMessage.intent] : [],
            // These fields are no longer provided, so we set safe defaults.
            isLowEffort: false,
            isSarcastic: false,
            isAmbiguous: false,
            isVulnerable: false,
            valence: 0,
            arousal: 0,
        },

        // responseSuggestions object
        responseSuggestions: {
            suggestedNextAction: safeGet(recommendedActions, 'suggestedNextAction', 'BUILD_RAPPORT'),
            length: safeGet(recommendedActions, 'length', 50),
            tone: safeGet(recommendedActions, 'tone', 50),
            linguisticStyle: safeGet(recommendedActions, 'linguisticStyle', 'casual'),
            emojiStrategy: safeGet(recommendedActions, 'emojiStrategy', 'auto'),
            endWithQuestion: safeGet(recommendedActions, 'endWithQuestion', false),
            keyTalkingPoints: safeGet(recommendedActions, 'next_topic_suggestion', []),
        },

        // memory object
        memory: {
            dateArcPhase: safeGet(recommendedActions, 'dateArcPhase', 'rapport'),
            insideJokes: safeGet(memorySummary, 'insideJokes', []),
            questionHistory: safeGet(memorySummary, 'questionHistory', []),
            // These fields are no longer provided
            topics: {},
            avoidedTopics: [],
        },

        // sexualAnalysis object
        sexualAnalysis: {
            sexualCommunicationStyle: safeGet(recommendedActions, 'sexualCommunicationStyle', 'playful_and_teasing'),
        },

        // dateAnalysis object
        dateAnalysis: {
            isVirtual: safeGet(recommendedActions, 'isVirtual', false),
        }
    };

    return transformed;
}
