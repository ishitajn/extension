// src/prompts/validator.js
export class PromptValidationError extends Error {
    constructor(errors) {
        super(`Prompt validation failed: ${errors.join(', ')}`);
        this.name = 'PromptValidationError';
        this.errors = errors;
    }
}

export function validatePromptInputs(data, conversationAnalysis, instructions) {
    const errors = [];
    
    // Validate required data
    if (!data || typeof data !== 'object') {
        errors.push('Missing or invalid data object');
    }
    
    // Validate conversation analysis
    if (!conversationAnalysis?.conversationState) {
        errors.push('Missing conversation state');
    }
    
    // Validate instructions for task prompt
    if (instructions && !instructions.flirtyValue && instructions.flirtyValue !== 0) {
        errors.push('Missing flirty value in instructions');
    }
    
    if (errors.length > 0) {
        throw new PromptValidationError(errors);
    }
}

export function sanitizeInputs(data, conversationAnalysis, instructions = null) {
    const sanitizedData = {
        theirProfile: data?.theirProfile || '',
        myProfile: data?.myProfile || '',
        conversationHistory: Array.isArray(data?.conversationHistory) ? data.conversationHistory : [],
        myName: data?.myName || 'User',
        theirName: data?.theirName || 'Match',
        isVerified: Boolean(data?.isVerified),
        timeSinceLastMessageInHours: Number(data?.timeSinceLastMessageInHours) || 0,
        geoContextData: data?.geoContextData || null,
        includeGeoContext: Boolean(data?.includeGeoContext)
    };
    
    const sanitizedAnalysis = {
        conversationState: conversationAnalysis?.conversationState || 'OPENER',
        lastMessageAnalysis: conversationAnalysis?.lastMessageAnalysis || {},
        memory: conversationAnalysis?.memory || {},
        forceNewTopic: Boolean(conversationAnalysis?.forceNewTopic),
        suppressGreeting: Boolean(conversationAnalysis?.suppressGreeting)
    };
    
    const sanitizedInstructions = instructions ? {
        goal: instructions?.goal || '',
        flirtyValue: Number(instructions?.flirtyValue) || 0,
        lengthValue: Number(instructions?.lengthValue) || 0,
        endWithQuestion: Boolean(instructions?.endWithQuestion),
        linguisticStyle: instructions?.linguisticStyle || 'standard',
        strictGoalOverride: Boolean(instructions?.strictGoalOverride),
        forceNewTopic: Boolean(instructions?.forceNewTopic),
        myName: instructions?.myName || sanitizedData.myName,
        theirName: instructions?.theirName || sanitizedData.theirName,
        emojiStrategy: instructions?.emojiStrategy || 'moderate',
        conversationBreakDetected: Boolean(instructions?.conversationBreakDetected)
    } : null;
    
    return { sanitizedData, sanitizedAnalysis, sanitizedInstructions };
}
