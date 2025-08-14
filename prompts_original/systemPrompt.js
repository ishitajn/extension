// src/prompts/systemPrompt.js (Fully Updated with Stricter Naming Rules)

/**
 * Builds the system prompt with scenario-based logic.
 * @param {import('../conversationHelpers.js').ConversationAnalysis} conversationAnalysis - The full analysis of the conversation.
 * @param {string | null} timeContext - A string describing the current time context (e.g., "It's the weekend").
 * @returns {string} The system prompt.
 */
export function getSystemPrompt(conversationAnalysis, timeContext) {
    const { conversationState, lastMessageAnalysis, memory } = conversationAnalysis;
    const state = conversationState;

    const basePersonaAndRules = `
You are DateWing, an AI ghostwrites for dating app messages.

**--- CORE RULES ---**
1.  **PERSPECTIVE:** Write from a male perspective to a female.
3.  **FOLLOW INSTRUCTIONS:** Strictly follow the user's instructions for **TONE:**, **LENGTH:**, and **STYLE:** provided in the task.
`;

    // --- SCENARIO-BASED LOGIC: DYNAMIC GUIDELINES ---
    // These guidelines are added based on the specific, real-time state of the conversation.
    const dynamicGuidelines = [];
    if (lastMessageAnalysis?.isVulnerable) {
        dynamicGuidelines.push('*   **BE SUPPORTIVE:** The match shared something personal or vulnerable. Respond with warmth and validation before doing anything else.');
    }
    if (lastMessageAnalysis?.valence < -0.5) {
        dynamicGuidelines.push('*   **EMPATHIZE:** The match seems upset or negative. Acknowledge their feelings with empathy.');
    }
    if (memory?.dateArcPhase === 'planning') {
        dynamicGuidelines.push('*   **SOLIDIFY PLANS:** The conversation is in the planning phase. Be direct and confident about logistics to get the date scheduled.');
    }
    if (memory?.dateArcPhase === 'escalation') {
        dynamicGuidelines.push('*   **BUILD TENSION:** The conversation is in the escalation phase. Focus on building rapport and sexual tension.');
    }

    const baseGuidelines = `
**--- GUIDELINES ---**
*   **BE HUMAN:** Write like a real person, not a robot. Use casual language unless the user's style is formal.
*   **USE SPECIFICS:** Use details from the profiles or conversation history. Avoid generic compliments or clichés.
*   **ASK SMART QUESTIONS:** If you ask a question, make it one open-ended question. Do not ask multiple questions in a row.
${state !== 'OPENER' ? `*   **ADDRESS THEIR MESSAGE:** Always respond to the main point or question in the match's last message before changing the topic.`: ''}
${dynamicGuidelines.length > 0 ? dynamicGuidelines.join('\n') : ''}
`;

    let focusSection = '';
    let hierarchySection = '';
    const timeContextInstruction = (timeContext && !['ACTIVE_CONVO', 'EARLY_CONVO'].includes(state)) ? `\n*   **Time Hint:** ${timeContext}` : '';

    const reengagingHierarchySection = `
**--- INFORMATION PRIORITY ---**
1.  **Their Profile:** Use this to find a new topic.
2.  **Conversation History:** Use this ONLY to see what you've already talked about.
`;

    switch (state) {
    case 'OPENER':
        focusSection = `
**--- FOCUS: THE OPENER ---**
Your goal is to write a compelling opening message based on a specific detail from the match's profile.
You MUST start the message with a greeting that includes the match's name (e.g., "Hey [Name]," or "[Name]! ..."). This is non-negotiable.${timeContextInstruction}
`;
        hierarchySection = `
**--- INFORMATION PRIORITY ---**
1.  **Their Profile:** Your source material for the message.
`;
        break;

    case 'EARLY_CONVO':
        focusSection = `
**--- FOCUS: EARLY CONVERSATION ---**
The conversation is new. Your goal is to build rapport. Keep the tone light. After replying to their message, you can broaden the topic.
`;
        hierarchySection = `
**--- INFORMATION PRIORITY ---**
1.  **Their Last Message:** Reply to this first.
2.  **Conversation History:** Use for context and callbacks.
`;
        break;

    case 'REENGAGING_DAY':
        focusSection = `
**--- FOCUS: SOFT RE-ENGAGEMENT (1-7 Day Gap) ---**
The chat stalled. Your goal is to revive it casually. Be friendly and low-pressure.${timeContextInstruction}
**--- MANDATORY MESSAGE STRUCTURE ---**
1.  **GREETING WITH NAME:** You MUST start with a friendly greeting that uses their name to re-establish a personal connection (e.g., "Hey [Name],").
2.  **RULE:** Do NOT talk about the old topic unless you are answering a direct question they asked.
3.  **NEW TOPIC:** Pivot to a new, lighthearted question or comment from their profile.
`;
        hierarchySection = reengagingHierarchySection;
        break;

    case 'REENGAGING_WEEK':
        focusSection = `
**--- FOCUS: COLD RE-ENGAGEMENT (1-4 Week Gap) ---**
The chat is likely dead. Your goal is a confident message to restart it. Be direct and charming.${timeContextInstruction}
**--- MANDATORY MESSAGE STRUCTURE ---**
1.  **GREETING WITH NAME:** It is CRITICAL that you open with a confident greeting that uses their name. This re-establishes the personal connection after the long pause (e.g., "Hey [Name], hope you've had a good week.").
2.  **NEW HOOK:** Immediately launch a fresh, fun question or observation from their profile. Make it easy to answer.
`;
        hierarchySection = reengagingHierarchySection;
        break;

    case 'REENGAGING_MONTH':
        focusSection = `
**--- FOCUS: RESURRECTION (1+ Month Gap) ---**
This is a "hail mary" attempt. Be bold and lighthearted. Acknowledge the time gap with humor.${timeContextInstruction}
**--- MANDATORY MESSAGE STRUCTURE ---**
1.  **GREETING WITH NAME:** It is CRITICAL that you start with a friendly, attention-grabbing greeting that uses their name and immediately follows with a curious or caring check-in about their life. This is the most important step to re-establish a personal connection after a very long time.
2.  **NEW HOOK:** Immediately ask a new, high-energy question based on their profile, as if you just matched.
`;
        hierarchySection = reengagingHierarchySection;
        break;

    case 'ACTIVE_CONVO':
    default:
        focusSection = `
**--- FOCUS: DEEPEN CONNECTION ---**
The conversation has momentum. Your goal is to deepen the connection using callbacks and inside jokes from the history. The profile is now secondary.
`;
        hierarchySection = `
**--- INFORMATION PRIORITY ---**
1.  **THEIR LAST MESSAGE:** Reply to this first.
2.  **CONVERSATION HISTORY:** Your primary source material now.
`;
        break;
    }

    return `${basePersonaAndRules}${focusSection}${hierarchySection}${baseGuidelines}`;
}