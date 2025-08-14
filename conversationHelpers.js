const DEBUG = {
    log: (category, message, data = null) => console.log(`[WINGMAN-HELPER-${category.toUpperCase()}] ${message}`, data ?? ''),
};
export const LINGUISTIC_STYLES = ['auto', 'casual', 'charming', 'direct', 'intellectual', 'mysterious', 'playful', 'poetic', 'sarcastic', 'sexual', 'witty'].sort((a, b) => a === 'auto' ? -1 : b === 'auto' ? 1 : a.localeCompare(b));
export const DATE_ARC_PHRASES = ['rapport', 'escalation', 'planning'];

// ===================================================================================
// SECTION 1: CORE STATE & SUBTEXT ANALYSIS
// ===================================================================================

/**
 * Analyzes only the last message from the match for immediate response context.
 * @param {Message[]} conversationHistory
 * @returns {LastMessageAnalysis} A structured subtext object or a default neutral object.
 */
function analyzeLastMessageForSubtext(conversationHistory) {
    const lastMessageFromMatch = conversationHistory?.filter(msg => msg.role === 'assistant').pop();
    if (!lastMessageFromMatch?.content) {
        return {
            valence: 0.0,
            arousal: 0.0,
            intents: [],
            isSarcastic: false,
            isAmbiguous: false,
            isVulnerable: false,
            isDirectQuestion: false,
            isLowEffort: true,
            isGeoRelated: false,
            suggestedResponseStyle: 'playful',
            questionInfo: {
                isQuestion: false,
                count: 0,
                type: 'none'
            },
        };
    }

    return {
        valence: 0.0,
        arousal: 0.0,
        intents: [],
        isSarcastic: false,
        isAmbiguous: false,
        isVulnerable: false,
        isDirectQuestion: false,
        isLowEffort: false,
        isGeoRelated: false,
        suggestedResponseStyle: 'playful',
        questionInfo: {
            isQuestion: false,
            count: 0,
            type: 'none'
        },
    };
}

// ===================================================================================
// SECTION 2: DYNAMIC MEMORY MANAGEMENT
// ===================================================================================

/**
 * Updates the memory object based on the entire conversation history.
 * @param {Message[]} conversationHistory
 * @param {MatchMemory} storedMemory
 * @returns {MatchMemory} The updated memory object.
 */
function updateMemoryFromHistory(conversationHistory, storedMemory) {
    let memory = JSON.parse(JSON.stringify(storedMemory || {
                topics: {},
                insideJokes: [],
                avoidedTopics: [],
                questionHistory: [],
                dateArcPhase: 'rapport'
            }));

    return memory;
}

// ===================================================================================
// SECTION 3: TOP-LEVEL ORCHESTRATOR
// ===================================================================================

/**
 * @param {Message[]} conversationHistory
 * @param {MatchMemory} storedMemory
 * @returns {{updatedMemory: MatchMemory, lastMessageAnalysis: LastMessageAnalysis}}
 */
export function runFullConversationAnalysis(conversationHistory, storedMemory) {
    DEBUG.log('ANALYSIS', 'Starting full conversation analysis...');
    const updatedMemory = updateMemoryFromHistory(conversationHistory, storedMemory);
    const lastMessageAnalysis = analyzeLastMessageForSubtext(conversationHistory);
    DEBUG.log('ANALYSIS', 'Full analysis finished.');
    return {
        updatedMemory,
        lastMessageAnalysis
    };
}

// ===================================================================================
// SECTION 4: HELPER FUNCTIONS
// ===================================================================================

/**
 * @param {Message[]} conversationHistory
 * @returns {ConversationState}
 */
export function determineConversationState(conversationHistory) {
    const messageCount = conversationHistory?.length || 0;
    if (messageCount === 0) {
        DEBUG.log('STATE', 'Determined state: OPENER (no history)');
        return 'OPENER';
    }

    const lastMessage = conversationHistory[messageCount - 1];
    const TWO_DAYS = 24 * 2,
    ONE_WEEK = 24 * 7,
    ONE_MONTH = 24 * 30;

    const hoursSinceMatchReply = calculateHoursSinceMatchReply(conversationHistory);
    const staleGapInHours = calculateStaleConversationGap(conversationHistory);
    let state = 'ACTIVE_CONVO';
    if (lastMessage.role === 'user') {
        if (hoursSinceMatchReply >= ONE_MONTH)
            state = 'REENGAGING_MONTH';
        else if (hoursSinceMatchReply >= ONE_WEEK)
            state = 'REENGAGING_WEEK';
        else if (hoursSinceMatchReply >= TWO_DAYS)
            state = 'REENGAGING_DAY';
    }
    if (lastMessage.role === 'assistant') {
        if (staleGapInHours >= ONE_MONTH)
            state = 'REENGAGING_MONTH';
        else if (staleGapInHours >= ONE_WEEK)
            state = 'REENGAGING_WEEK';
        else if (staleGapInHours >= TWO_DAYS)
            state = 'REENGAGING_DAY';
    }

    if (state === 'ACTIVE_CONVO' && messageCount < 5) {
        state = 'EARLY_CONVO';
    }

    DEBUG.log('STATE', `Determined state: ${state}`, {
        messageCount,
        hoursSinceMatchReply,
        staleGapInHours
    });
    return state;
}
function calculateHoursSinceMatchReply(conversationHistory) {
    const lastMatchMessage = conversationHistory?.filter(msg => msg.role === 'assistant').pop();
    if (!lastMatchMessage || !lastMatchMessage.date)
        return Infinity;
    try {
        return (new Date() - new Date(lastMatchMessage.date)) / (1000 * 60 * 60);
    } catch (e) {
        return Infinity;
    }
}

function calculateStaleConversationGap(conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2)
        return 0;
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const secondToLastMessage = conversationHistory[conversationHistory.length - 2];
    if (!lastMessage.date || !secondToLastMessage.date)
        return 0;
    try {
        return (new Date(lastMessage.date) - new Date(secondToLastMessage.date)) / (1000 * 60 * 60);
    } catch (e) {
        return 0;
    }
}

export function hasRecentGreeting(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0)
        return false;
    const todayDateString = new Date().toISOString().split('T')[0];
    const GREETING_KEYWORDS = ['hey', 'hi', 'hello', 'yo', 'sup', 'hiya', 'heya', 'howdy', 'wassup', 'what up', 'what\'s up', 'greetings', 'salutations', 'aloha', 'ahoy', 'good morning', 'morning', "'morning", 'good afternoon', 'afternoon', 'good evening', 'evening', 'good day', 'how are you', 'how are ya', 'how you doing', 'how you doin', 'how\'s it going', 'hows it going', 'how is it going', 'how have you been', 'how\'s things', 'how\'s life', 'what\'s new', 'what\'s good', 'what\'s goodie', 'what\'s happening', 'what\'s crackin', 'what\'s poppin', 'long time no see', 'nice to see you', 'nice to meet you', 'pleasure to meet you', 'dear', 'to whom it may concern', 'attention', 'welcome', 'gm', 'gn', 'yerrr', 'o/', '\\o', 'hewwo', 'henlo', 'g\'day', 'howzit', 'alright?', 'u alright?', 'wagwan', 'ey up', 'what\'s the craic?', 'cheers', 'hiya pal', 'top of the morning to ya', 'oi', 'psst', 'ahem', 'excuse me', 'yo, asshole', 'hey, fucker', 'sup, bitches', 'look here', 'what do you want', ];
    return conversationHistory.some(msg => {
        if (!msg.date || !msg.date.startsWith(todayDateString))
            return false;
        const firstWord = msg.content.trim().toLowerCase().split(' ')[0].replace(/[.,!?-]/g, '');
        return GREETING_KEYWORDS.includes(firstWord);
    });
}

export function getToneDescription(value) {
    const levels = {
        100: 'Be explicitly sexual and daring.',
        90: 'Be intensely flirty and bold.',
        80: 'Be very flirty and confident.',
        70: 'Be flirty and playful.',
        60: 'Be moderately flirty and engaging.',
        50: 'Be lightly flirty and casually engaging.',
        40: 'Be friendly and approachable.',
        30: 'Be warm and relaxed.',
        20: 'Be polite and friendly.',
        10: 'Be polite and straightforward.',
        0: 'Be completely neutral and formal.'
    };
    return levels[Object.keys(levels).reverse().find(k => value >= k) || 0];
}

export function getLengthDescription(value) {
    const levels = {
        100: 'Strictly 8+ sentences (a manifesto).',
        90: 'Strictly 6–7 sentences (epic).',
        80: 'Strictly 5–6 sentences (very long).',
        70: 'Strictly 4–5 sentences (long).',
        60: 'Strictly 3–4 sentences (moderately long).',
        50: 'Strictly 2–3 sentences (medium).',
        40: 'Strictly 2 sentences (moderately short).',
        30: 'Strictly 1–2 sentences (short).',
        20: 'Strictly one full sentence (very short).',
        10: 'Strictly 5–10 words (ultra short).',
        0: 'Strictly 2–5 words (micro).'
    };
    return levels[Object.keys(levels).reverse().find(k => value >= k) || 0];
}

export function getStyleDescription(style, analysis) {
    if (style === 'auto' && analysis?.lastMessageAnalysis?.suggestedResponseStyle) {
        return `Strictly adopt a ${analysis.lastMessageAnalysis.suggestedResponseStyle} style.`;
    }
    const styles = {
        'witty': 'Write with a witty and humorous style.',
        'intellectual': 'Write with an intellectual and deep style.',
        'playful': 'Write with a playful and teasing style.',
        'direct': 'Write with a direct and confident style.',
        'poetic': 'Write with a poetic and romantic style.',
        'sexual': 'Write with a bold, provocative and sexual style.',
        'sarcastic': 'Write with a sarcastic and sharp style.',
        'charming': 'Write with a charming and suave style.',
        'casual': 'Write with a casual and laid-back style.',
        'mysterious': 'Write with a mysterious and intriguing style.'
    };
    return styles[style] || 'Write with a natural and conversational style.';
}

export function getEmojiInstruction(strategy, flirtyValue, linguisticStyle) {
    if (!strategy || strategy === 'no_emoji')
        return '';
    const autoDesc = () => {
        if (['intellectual', 'poetic', 'sarcastic'].includes(linguisticStyle))
            return 'Avoid emojis almost entirely.';
        if (flirtyValue >= 80)
            return 'Feel free to use 1-3 bold or suggestive emojis (e.g., 😏, 😈, 🔥).';
        if (flirtyValue >= 60)
            return 'Incorporate one or two well-placed, playful emojis (e.g., 😉, 😂, 😜).';
        if (flirtyValue >= 40)
            return 'You may use a single, simple, and friendly emoji (e.g., 🙂, 👍).';
        if (['playful', 'witty', 'charming'].includes(linguisticStyle))
            return 'You can use one well-placed emoji to add personality.';
        return 'Be very conservative with emojis.';
    };
    const map = {
        'auto': autoDesc(),
        'friendly': 'You may use a single, simple, and friendly emoji (e.g., 🙂, 👍).',
        'playful': 'Incorporate one or two well-placed, playful emojis (e.g., 😉, 😂).',
        'bold': 'Feel free to use 1-3 bold or suggestive emojis (e.g., 😏, 😈, 🔥).'
    };
    return map[strategy] || '';
}

export function getTimeContext() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    let dayPeriod = hour < 5 ? 'late night' : hour < 8 ? 'early morning' : hour < 12 ? 'morning' : hour < 14 ? 'afternoon' : hour < 17 ? 'late afternoon' : hour < 19 ? 'evening' : hour < 22 ? 'late evening' : 'night';
    if (day === 0 || day === 6 || (day === 5 && hour >= 17)) {
        return `It's the weekend, ${dayName}(${dayPeriod}). You can use a more relaxed, fun-oriented greeting.`;
    }
    if (day >= 1 && day <= 5) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        return `It's a weekday, ${dayName} - ${dayPeriod}. A casual check-in about their day or a light greeting (e.g., "Happy ${dayName}!") is appropriate.`;
    }
    return null;
}
