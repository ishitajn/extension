// src/prompts.js (Corrected with Consistent Data Structuring)

import { getTimeContext } from './conversationHelpers.js';
import { getSystemPrompt } from './prompts/systemPrompt.js';
import { buildContextPrompt } from './prompts/contextPrompt.js';
import { buildTaskPrompt } from './prompts/taskPrompt.js';

/**
 * @param {import('./conversationHelpers.js').GenerationData} data
 * @returns {{systemMessage: string, userMessage: string}}
 */
export function generatePrompts(data) {
    // FIX: Destructure from the clean, top-level data object
    const { conversationHistory, taskInstructions, geoContextData, forceIncludeGeoContext, conversationAnalysis } = data;

    // If conversationAnalysis is missing, we cannot proceed.
    if (!conversationAnalysis) {
        throw new Error("generatePrompts failed: conversationAnalysis object is missing.");
    }

    const state = conversationAnalysis.conversationState;

    // Geo-context inclusion logic
    const lastMessageFromMatch = conversationHistory?.filter(msg => msg.role === 'assistant').pop()?.content || '';
    let includeGeoContext = false;
    if (geoContextData) {
        if (forceIncludeGeoContext || (geoContextData.distance.miles > 100 && (state === 'OPENER' || state.startsWith('REENGAGING'))) || conversationAnalysis.lastMessageAnalysis.isGeoRelated) {
            includeGeoContext = true;
        }
    }

    const timeContext = getTimeContext();
    const contextData = {
        ...data,
        includeGeoContext
    };

    // The taskInstructions object is already correctly structured from popup.js
    // We just need to add the conversationBreakDetected flag.
    const finalTaskInstructions = {
        ...taskInstructions,
        conversationBreakDetected: state.startsWith('REENGAGING'),
    };

    const systemMessage = getSystemPrompt(conversationAnalysis, timeContext);
    const contextMessage = buildContextPrompt(contextData, conversationAnalysis);
    // FIX: Pass conversationAnalysis explicitly to buildTaskPrompt
    const taskMessage = buildTaskPrompt(finalTaskInstructions, contextData, conversationAnalysis);

    const userMessage = `${contextMessage}\n${taskMessage}`;

    return {
        systemMessage,
        userMessage
    };
}