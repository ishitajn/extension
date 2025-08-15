import { validatePromptInputs, sanitizeInputs, ContentBuilder, CONTENT_PRIORITIES } from './promptUtils.js';

export function getSystemPrompt(conversationAnalysis, timeContext, forceNewTopic) {
    try {
        validatePromptInputs({}, conversationAnalysis);
        const { sanitizedAnalysis } = sanitizeInputs({}, conversationAnalysis);
        
        const { conversationState, lastMessageAnalysis, memory } = sanitizedAnalysis;
        
        const builder = new ContentBuilder();
        
        // Core system prompt (highest priority)
        const corePrompt = buildCorePrompt();
        builder.addSection('core', corePrompt, CONTENT_PRIORITIES.TASK_DIRECTIVES);
        
        // Dynamic guidelines based on analysis
        const dynamicGuidelines = buildDynamicGuidelines(lastMessageAnalysis, memory);
        if (dynamicGuidelines) {
            builder.addSection('dynamic', dynamicGuidelines, CONTENT_PRIORITIES.CRITICAL_OVERRIDES);
        }
        
        // State-specific focus and hierarchy
        const stateContent = buildStateSpecificContent(conversationState, forceNewTopic);
        builder.addSection('state', stateContent, CONTENT_PRIORITIES.LAST_MESSAGE_CONTEXT);
        
        // Base guidelines (medium priority)
        const baseGuidelines = buildBaseGuidelines(forceNewTopic, conversationState);
        builder.addSection('guidelines', baseGuidelines, CONTENT_PRIORITIES.MEMORY_STRATEGY);
        
        return builder.build();
        
    } catch (error) {
        console.error('Error building system prompt:', error);
        return buildFallbackSystemPrompt();
    }
}

function buildCorePrompt() {
    return `You are DateWing, an AI ghostwriter for dating app messages.

**--- CORE RULES ---**
1. **PERSPECTIVE:** Write from a male perspective to a female.
2. **FOLLOW INSTRUCTIONS:** Strictly follow the user's instructions for **TONE**, **LENGTH**, and **STYLE** in the task.`;
}

function buildDynamicGuidelines(lastMessageAnalysis, memory) {
    const guidelines = [];

    if (lastMessageAnalysis?.isVulnerable) {
        guidelines.push('* **BE SUPPORTIVE:** Respond with warmth and validation.');
    }
    if (lastMessageAnalysis?.valence < -0.5) {
        guidelines.push('* **EMPATHIZE:** Acknowledge their feelings with empathy.');
    }
    if (lastMessageAnalysis?.isLowEffort) {
        guidelines.push('* **LEAD THE CONVERSATION:** Their last message was low-effort. Take initiative with a new topic or question.');
    }
    if (lastMessageAnalysis?.isSarcastic) {
        guidelines.push('* **MATCH SARCASM (optional):** Consider a witty or playful sarcastic response if it fits the overall tone.');
    }
    if (lastMessageAnalysis?.isAmbiguous) {
        guidelines.push('* **SEEK CLARITY:** Their message is unclear. Ask a clarifying question or make a safe assumption.');
    }
    if (memory?.dateArcPhase === 'planning') {
        guidelines.push('* **SOLIDIFY PLANS:** Be confident about logistics.');
    }
    if (memory?.dateArcPhase === 'escalation') {
        guidelines.push('* **BUILD TENSION:** Focus on sexual/romantic tension.');
    }

    return guidelines.length > 0 ? `**--- DYNAMIC GUIDELINES ---**
${guidelines.join('\n')}` : null;
}

function buildStateSpecificContent(state, forceNewTopic) {
    const stateConfig = {
        'OPENER': {
            focus: 'Start with a greeting using their name. Pull a detail from their profile.',
            hierarchy: '1. **Their Profile**'
        },
        'EARLY_CONVO': {
            focus: 'Build rapport. Light tone. Expand on common interests.',
            hierarchy: '1. **Their Last Message**\n2. **Conversation History**'
        },
        'REENGAGING_DAY': {
            focus: 'Start with a warm greeting. Pivot to a fresh topic. Avoid rehashing.',
            hierarchy: '1. **Their Profile:** For new topic selection.\n2. **Conversation History:** For topic avoidance only.'
        },
        'REENGAGING_WEEK': {
            focus: 'Start with a warm greeting. Pivot to a fresh topic. Avoid rehashing.',
            hierarchy: '1. **Their Profile:** For new topic selection.\n2. **Conversation History:** For topic avoidance only.'
        },
        'REENGAGING_MONTH': {
            focus: 'Start with a warm greeting. Pivot to a fresh topic. Avoid rehashing.',
            hierarchy: '1. **Their Profile:** For new topic selection.\n2. **Conversation History:** For topic avoidance only.'
        }
    };
    
    const config = stateConfig[state] || {
        focus: 'Deepen connection. Use callbacks and inside jokes. Profile is secondary.',
        hierarchy: `1. ${forceNewTopic ? 'CONVERSATION HISTORY (for context)' : 'Their Last Message'}\n2. Conversation History`
    };
    
    return `**--- FOCUS: ${state.replace(/_/g, ' ')} ---**
${config.focus}

**--- INFORMATION PRIORITY ---**
${config.hierarchy}`;
}

function buildBaseGuidelines(forceNewTopic, state) {
    const guidelines = [
        '* **BE HUMAN:** Write like a real person, not a bot.',
        '* **USE SPECIFICS:** Use real details. No clichés.',
        '* **ASK SMART QUESTIONS:** Only one open-ended question if any.'
    ];
    
    if (!forceNewTopic && state !== 'OPENER') {
        guidelines.push('* **ADDRESS THEIR MESSAGE:** Reply to their main point before changing topic.');
    }
    
    return `**--- GUIDELINES ---**
${guidelines.join('\n')}`;
}

function buildFallbackSystemPrompt() {
    return `You are DateWing, an AI ghostwriter for dating app messages.

**--- CORE RULES ---**
1. **PERSPECTIVE:** Write from a male perspective to a female.
2. **BE HUMAN:** Write like a real person, not a bot.

**--- CRITICAL ERROR NOTICE ---**
Using fallback system prompt due to validation error. Proceed with basic guidelines.`;
}