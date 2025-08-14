// src/prompts/taskPrompt.js (Corrected with Defensive Destructuring and Optional Chaining)

import { getToneDescription, getLengthDescription, getStyleDescription, getEmojiInstruction } from '../conversationHelpers.js';

// FIX: Accept conversationAnalysis as the third parameter
export function buildTaskPrompt(instructions, data, conversationAnalysis) {
    // FIX: Destructure only what's needed from instructions
    const { goal, flirtyValue, lengthValue, endWithQuestion, linguisticStyle, strictGoalOverride, forceNewTopic, myName, theirName, emojiStrategy, conversationBreakDetected } = instructions;

    // FIX: Use the explicit conversationAnalysis parameter, providing a fallback.
    const { suppressGreeting, memory, lastMessageAnalysis } = conversationAnalysis || {};

    const { theirProfile, myProfile, conversationHistory, isVerified, timeSinceLastMessageInHours, geoContextData, includeGeoContext,  } = data;

    const emojiInstruction = getEmojiInstruction(emojiStrategy, flirtyValue, linguisticStyle);

	const lastMessageFromMatch = conversationHistory?.filter(msg => msg.role === 'assistant').pop()?.content || '';

    if (strictGoalOverride && goal) {
        const finalPrompt = `
**HARD RESET INITIATED — USER GOAL OVERRIDE TAKES ABSOLUTE PRIORITY**
Your ONLY job is to generate one message that fulfills the user’s goal: "${goal}"
Do NOT use any other context. Strictly follow the requested tone, length, and style.

--- EXECUTION PARAMETERS ---
- **TONE:** ${getToneDescription(flirtyValue)}
- **LENGTH:** ${getLengthDescription(lengthValue)}
- **LINGUISTIC STYLE:** ${getStyleDescription(linguisticStyle, conversationAnalysis)}
${emojiInstruction ? `- **EMOJI USAGE:** ${emojiInstruction}` : ''}
`;
        const finalCommand = `--- FINAL COMMAND ---\nWrite the next message for **${myName || 'the male user'}**. Only return the message text.`;
        return [finalPrompt, finalCommand].join('\n\n');
    }

    const memoryNotes = [];
    // Use optional chaining ('?.') for maximum resilience against undefined data.
    if (memory?.dateArcPhase === 'planning')
        memoryNotes.push('**STRATEGIC CONTEXT: PLANNING PHASE.** Focus on confidently solidifying a date.');
    else if (memory?.dateArcPhase === 'escalation')
        memoryNotes.push('**STRATEGIC CONTEXT: ESCALATION PHASE.** Build sexual tension and transition towards planning a date.');
    if (memory?.insideJokes?.length > 0)
        memoryNotes.push(`**STRATEGIC CALLBACK:** You can reference this inside joke: "${memory.insideJokes.slice(-1)[0]}"`);
    const goodTopics = Object.entries(memory?.topics || {}).filter(([, data]) => data.score > 0.5).sort((a, b) => b[1].score - a[1].score).map(([topic]) => topic);
    if (goodTopics.length > 0)
        memoryNotes.push(`**GOOD TOPICS:** The match responds well to: ${goodTopics.slice(0, 2).join(', ')}.`);
    if (memory?.questionHistory?.length > 0)
        memoryNotes.push(`**AVOID REPEATING:** You already asked about: "${memory.questionHistory.slice(-1)[0]}".`);

    const memorySection = memoryNotes.length > 0 ? `--- MEMORY & STRATEGY (Creative Fuel) ---\n${memoryNotes.join('\n')}` : '';

    const strategicNotes = [];
    if (suppressGreeting)
        strategicNotes.push('**CRITICAL PROTOCOL: NO GREETING.** A greeting was already exchanged today.');
    if (forceNewTopic && !conversationBreakDetected)
        strategicNotes.push('**CRITICAL PROTOCOL: FORCE NEW TOPIC.** Ignore the match\'s last message and start a fresh conversation thread.');
    if (conversationBreakDetected)
        strategicNotes.push('**CRITICAL PROTOCOL: RE-ENGAGEMENT DETECTED.** The conversation stalled. Revive it with a new, high-value message from their profile.');
    if (memory?.avoidedTopics?.length > 0)
        strategicNotes.push(`**CRITICAL PROTOCOL: AVOID THESE TOPICS.** The match has reacted negatively to: ${memory.avoidedTopics.join(', ')}.`);

    if (lastMessageAnalysis) {
        if (lastMessageAnalysis.isSarcastic)
            strategicNotes.push('**CRITICAL PROTOCOL: SARCASM DETECTED.** Do not take their last statement literally. Respond to the underlying sentiment.');
        if (lastMessageAnalysis.intents?.includes('flirting_or_sexual'))
            strategicNotes.push('**STRATEGIC NOTE: SEXUAL TENSION DETECTED.** Match their energy confidently. This is a green light for sexual escalation.');
        if (lastMessageAnalysis.intents?.includes('questioning'))
            strategicNotes.push(`**CRITICAL PROTOCOL: ANSWER THE QUESTION.** The match asked a question: "${lastMessageFromMatch}". You MUST answer it.`);
        if (lastMessageAnalysis.isAmbiguous)
            strategicNotes.push('**STRATEGIC NOTE: AMBIGUITY DETECTED.** Convert their vague positive response into a concrete plan.');
        if (lastMessageAnalysis.intents?.includes('planning'))
            strategicNotes.push('**STRATEGIC NOTE: LOGISTICS SIGNAL DETECTED.** Move towards solidifying plans.');
        if (lastMessageAnalysis.isVulnerable)
            strategicNotes.push('**CRITICAL PROTOCOL: VULNERABILITY DETECTED.** Respond with warmth, validation, and support.');
        if (lastMessageAnalysis.valence < -0.5)
            strategicNotes.push('**CRITICAL PROTOCOL: NEGATIVE TONE DETECTED.** Adjust your tone to be more supportive and empathetic.');
        if (lastMessageAnalysis.isLowEffort)
            strategicNotes.push('**STRATEGIC NOTE: LOW-EFFORT REPLY DETECTED.** Their last message was short. Your reply needs to be more engaging to carry the conversation.');
    }

    const userGoal = goal?.trim() ? `- **ABSOLUTE PRIORITY – USER'S GOAL:** ${goal}` : '';

    const directives = `
--- YOUR TASK & DIRECTIVES (Core Constraints) ---
- **TONE:** ${getToneDescription(flirtyValue)}
- **LENGTH:** ${getLengthDescription(lengthValue)}
- **LINGUISTIC STYLE:** ${getStyleDescription(linguisticStyle, conversationAnalysis)}
${emojiInstruction ? `- **EMOJI USAGE:** ${emojiInstruction}` : ''}
- **CONVERSATIONAL GOAL:** ${endWithQuestion ? "Conclude with an engaging, open-ended question." : "Avoid ending with a direct question. Aim for a statement that invites a response."}
${userGoal}
`.trim();

    const finalCommand = `
--- FINAL COMMAND ---
Write the next message for **${myName || 'USER'}** - the male, replying to **${theirName || 'MATCH'}** - the female. Only return the message text. No labels, no quotes, no extra formatting.
`.trim();

    return [
        memorySection,
        directives,
        strategicNotes.length > 0 ? `--- CRITICAL OVERRIDES & NOTES ---\n${strategicNotes.join('\n')}` : '',
        finalCommand
    ].filter(Boolean).join('\n\n');
}