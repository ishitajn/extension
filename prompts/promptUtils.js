// src/prompts/promptUtils.js

// From contentPrioritizer.js
export const CONTENT_PRIORITIES = {
    TASK_DIRECTIVES: 10,      // Always include - core instructions
    CRITICAL_OVERRIDES: 9,    // Always include - strategic notes
    LAST_MESSAGE_CONTEXT: 8, // High priority - immediate context
    RECENT_HISTORY: 7,        // High priority - conversation flow
    PROFILE_PRIMARY: 6,       // Medium-high - varies by state
    MEMORY_STRATEGY: 5,       // Medium - strategic context
    PROFILE_SECONDARY: 4,     // Medium-low - background context
    GEO_CONTEXT: 2,          // Low - situational only
    METADATA: 1              // Lowest - optional context
};

export class ContentBuilder {
    constructor() {
        this.sections = new Map();
    }

    addSection(name, content, priority = 5) {
        if (content && content.trim()) {
            this.sections.set(name, {
                content: content.trim(),
                priority,
                length: content.length
            });
        }
        return this;
    }

    build() {
        return Array.from(this.sections.entries())
            .sort(([,a], [,b]) => b.priority - a.priority)
            .map(([, section]) => section.content)
            .join('\n\n');
    }

    getSectionCount() {
        return this.sections.size;
    }

    getTotalLength() {
        return Array.from(this.sections.values()).reduce((sum, section) => sum + section.length, 0);
    }
}

// From validator.js
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

// From templates.js
export const TEMPLATES = {
    // Section headers with consistent formatting
    SECTION_HEADER: (title) => `--- ${title.toUpperCase()} ---`,

    // Profile templates with priority indicators
    PROFILE_PRIMARY: (name, profile) => `**${name?.toUpperCase() || 'MATCH'}'S PROFILE (PRIMARY SOURCE):** ${profile || 'Not provided.'}`,
    PROFILE_CONTEXT: (name, profile) => `**${name?.toUpperCase() || 'USER'}'S PROFILE:** ${profile || 'Not provided.'}`,
    PROFILE_SECONDARY: (name, profile) => `**${name?.toUpperCase() || 'MATCH'}'S PROFILE (SECONDARY):** ${profile || 'Not provided.'}`,

    // Contextual notices
    CRITICAL_NOTICE: (message) => `(NOTE: ${message})`,
    TIME_GAP_NOTICE: (type) => {
        const messages = {
            'REENGAGING_DAY': '1-7 day gap. You are in SOFT RE-ENGAGEMENT mode.',
            'REENGAGING_WEEK': '1-4 week gap. You are in COLD RE-ENGAGEMENT mode.',
            'REENGAGING_MONTH': '1+ month gap. You are in RESURRECTION mode.'
        };
        return `(Note: ${messages[type] || 'Re-engagement mode'})`;
    },

    // Message formatting
    MESSAGE_FORMAT: (date, sender, content) => `[${date}] ${sender}: ${content}`,

    // Geo context
    GEO_CONTEXT: (data) => `- **GEO-TEMPORAL CONTEXT:** (Use for planning/travel topics only)
  - Your Time: ${data.userTimeOfDay} in ${data.userTimezone}
  - Their Time: ${data.matchTimeOfDay} in ${data.matchTimeZoneName}
  - Distance: ${data.distance.miles} miles (${data.distance.km} km)${data.timeZoneDifference !== null ? `\n  - Time Difference: ${data.timeZoneDifference} hour(s)` : ''}${data.countryDifference ? `\n  - Country Difference: ${data.countryDifference}` : ''}`
};
