// src/prompts/contextPrompt.js

/**
 * Builds the contextual part of the user prompt.
 * This version simplifies complex instructions for smaller models.
 *
 * @param {object} data - The dynamic data for the current request.
 * @param {import('../conversationHelpers.js').ConversationAnalysis} conversationAnalysis - The full analysis of the conversation.
 * @returns {string} The fully assembled context prompt.
 */
export function buildContextPrompt(data, conversationAnalysis) {
    const { conversationState, lastMessageAnalysis } = conversationAnalysis;
    const state = conversationState; // for brevity

    const { theirProfile, myProfile, conversationHistory, myName, theirName, isVerified, timeSinceLastMessageInHours, geoContextData, includeGeoContext,  } = data;

    // --- 1. Metadata Generation (with simplified instruction) ---
    const geoContext = (includeGeoContext && geoContextData) ? `
- **GEO-TEMPORAL CONTEXT:** (Use this info for planning/travel topics only. Otherwise, ignore it.)
  - Your (User's) Time of Day: ${geoContextData.userTimeOfDay} in ${geoContextData.userTimezone}
  - Their (Match's) Time of Day: ${geoContextData.matchTimeOfDay} in ${geoContextData.matchTimeZoneName}
  - Approximate Distance: ${geoContextData.distance.miles} miles (${geoContextData.distance.km} km)
  ${geoContextData.timeZoneDifference !== null ? `- Time Difference: ${geoContextData.timeZoneDifference} hour(s)` : ''}
  ${geoContextData.countryDifference ? `- Country Difference: ${geoContextData.countryDifference}` : ''}
` : '';

    const metadataSection = geoContext ? `
--- CONVERSATIONAL METADATA ---${geoContext}
` : '';

    let historySection = '';
    if (state !== 'OPENER') {
        const formatHistoryForPrompt = (history) => {
            // --- SCENARIO-BASED LOGIC: Add a contextual notice based on the last message ---
            let contextualNotice = '';
            if (lastMessageAnalysis?.isDirectQuestion) {
                contextualNotice = `(NOTE: The match's last message contains a question. Answer it.)\n`;
            } else if (lastMessageAnalysis?.isLowEffort) {
                contextualNotice = `(NOTE: The match's last reply was very short. Your message needs to re-engage them.)\n`;
            }

            let timeGapNotice = '';
            switch (state) {
            case 'REENGAGING_DAY':
                timeGapNotice = `(Note: 1-7 day gap. You are in SOFT RE-ENGAGEMENT mode.)\n`;
                break;
            case 'REENGAGING_WEEK':
                timeGapNotice = `(Note: 1-4 week gap. You are in COLD RE-ENGAGEMENT mode.)\n`;
                break;
            case 'REENGAGING_MONTH':
                timeGapNotice = `(Note: 1+ month gap. You are in RESURRECTION mode.)\n`;
                break;
            }

            const formattedMessages = history.map(msg => {
                const prefix = msg.role === 'assistant' ? `${theirName || 'Match'}:` : `${myName || 'You'}:`;
                return `[${msg.date}] ${prefix} ${msg.content}`;
            }).join('\n').trim();

            return contextualNotice + timeGapNotice + formattedMessages;
        };
        historySection = `--- CONVERSATION HISTORY ---\n${formatHistoryForPrompt(conversationHistory)}`;
    }

    // --- 3. Conditional Profile Inclusion (Logic is solid, no changes needed) ---
    let profileSection = '';
    switch (state) {
    case 'OPENER':
        profileSection = `
--- THEIR PROFILE (PRIMARY SOURCE) ---
- **MATCH'S PROFILE (${theirName || 'THE MATCH'}):** ${theirProfile || 'Not provided.'}

--- MY PROFILE (FOR CONTEXT) ---
- **MY PROFILE (${myName || 'THE USER'}):** ${myProfile || 'Not provided.'}
`;
        break;
    case 'EARLY_CONVO':
        profileSection = `
--- PROFILE CONTEXT (USE FOR COMMON GROUND) ---
- **MY PROFILE (${myName || 'THE USER'}):** ${myProfile || 'Not provided.'}
- **MATCH'S PROFILE (${theirName || 'THE MATCH'}):** ${theirProfile || 'Not provided.'}
`;
        break;
    case 'REENGAGING_DAY':
    case 'REENGAGING_WEEK':
    case 'REENGAGING_MONTH':
        profileSection = `
--- THEIR PROFILE (PRIMARY SOURCE FOR NEW TOPIC) ---
- **MATCH'S PROFILE (${theirName || 'THE MATCH'}):** ${theirProfile || 'Not provided.'}
`;
        break;
    case 'ACTIVE_CONVO':
        profileSection = `
--- PROFILE CONTEXT (SECONDARY - FOR NEW TOPICS ONLY) ---
- **MATCH'S PROFILE (${theirName || 'THE MATCH'}):** ${theirProfile || 'Not provided.'}
`;
        break;
    }

    // --- 4. Final Assembly ---
    return [
        metadataSection,
        historySection,
        profileSection
    ].filter(Boolean).join('\n');
}