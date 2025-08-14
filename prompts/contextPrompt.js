import { TEMPLATES } from './templates.js';
import { validatePromptInputs, sanitizeInputs } from './validator.js';
import { ContentBuilder, CONTENT_PRIORITIES } from './contentPrioritizer.js';

export function buildContextPrompt(data, conversationAnalysis) {
    try {
        validatePromptInputs(data, conversationAnalysis);
        const { sanitizedData, sanitizedAnalysis } = sanitizeInputs(data, conversationAnalysis);
        
        const { conversationState, lastMessageAnalysis } = sanitizedAnalysis;
        const { 
            theirProfile, myProfile, conversationHistory, myName, theirName,
            geoContextData, includeGeoContext 
        } = sanitizedData;
        
        const builder = new ContentBuilder();
        
        // 1. Geo Context (lowest priority)
        if (includeGeoContext && geoContextData) {
            const geoContent = `${TEMPLATES.SECTION_HEADER('CONVERSATIONAL METADATA')}
${TEMPLATES.GEO_CONTEXT(geoContextData)}`;
            builder.addSection('geo_context', geoContent, CONTENT_PRIORITIES.GEO_CONTEXT);
        }
        
        // 2. Conversation History (high priority for non-openers)
        if (conversationState !== 'OPENER' && conversationHistory.length > 0) {
            const historyContent = buildHistorySection(
                conversationHistory, lastMessageAnalysis, conversationState, myName, theirName
            );
            builder.addSection('history', historyContent, CONTENT_PRIORITIES.RECENT_HISTORY);
        }
        
        // 3. Profile Sections (priority varies by state)
        const profileContent = buildProfileSection(conversationState, theirProfile, myProfile, myName, theirName);
        const profilePriority = getProfilePriority(conversationState);
        builder.addSection('profiles', profileContent, profilePriority);
        
        return builder.build();
        
    } catch (error) {
        console.error('Error building context prompt:', error);
        // Fallback to minimal context
        return buildFallbackContext(data, conversationAnalysis);
    }
}

function buildHistorySection(history, lastMessageAnalysis, state, myName, theirName) {
    const notices = [];
    
    // Add contextual notices based on analysis
    if (lastMessageAnalysis?.isDirectQuestion) {
        notices.push(TEMPLATES.CRITICAL_NOTICE("The match's last message contains a question. Answer it."));
    }
    if (lastMessageAnalysis?.isLowEffort) {
        notices.push(TEMPLATES.CRITICAL_NOTICE("The match's last reply was very short. Your message needs to re-engage them."));
    }
    
    // Add time gap notices
    if (['REENGAGING_DAY', 'REENGAGING_WEEK', 'REENGAGING_MONTH'].includes(state)) {
        notices.push(TEMPLATES.TIME_GAP_NOTICE(state));
    }
    
    // Format messages efficiently
    const formattedMessages = history
        .map(msg => {
            const sender = msg.role === 'assistant' ? theirName : myName;
            return TEMPLATES.MESSAGE_FORMAT(msg.date, sender, msg.content);
        })
        .join('\n');
    
    const noticeText = notices.length > 0 ? notices.join('\n') + '\n' : '';
    
    return `${TEMPLATES.SECTION_HEADER('CONVERSATION HISTORY')}
${noticeText}${formattedMessages}`;
}

function buildProfileSection(state, theirProfile, myProfile, myName, theirName) {
    const sections = [];
    
    switch (state) {
        case 'OPENER':
            sections.push(TEMPLATES.PROFILE_PRIMARY(theirName, theirProfile));
            sections.push(TEMPLATES.PROFILE_CONTEXT(myName, myProfile));
            return `${TEMPLATES.SECTION_HEADER('PROFILE CONTEXT')}
${sections.join('\n\n')}`;
            
        case 'EARLY_CONVO':
            sections.push(TEMPLATES.PROFILE_CONTEXT(myName, myProfile));
            sections.push(TEMPLATES.PROFILE_CONTEXT(theirName, theirProfile));
            return `${TEMPLATES.SECTION_HEADER('PROFILE CONTEXT (USE FOR COMMON GROUND)')}
${sections.join('\n\n')}`;
            
        case 'REENGAGING_DAY':
        case 'REENGAGING_WEEK':
        case 'REENGAGING_MONTH':
            return `${TEMPLATES.SECTION_HEADER('PROFILE CONTEXT')}
${TEMPLATES.PROFILE_PRIMARY(theirName, theirProfile)}`;
            
        case 'ACTIVE_CONVO':
            return `${TEMPLATES.SECTION_HEADER('PROFILE CONTEXT (SECONDARY - FOR NEW TOPICS ONLY)')}
${TEMPLATES.PROFILE_SECONDARY(theirName, theirProfile)}`;
            
        default:
            return `${TEMPLATES.SECTION_HEADER('PROFILE CONTEXT')}
${TEMPLATES.PROFILE_CONTEXT(theirName, theirProfile)}`;
    }
}

function getProfilePriority(state) {
    switch (state) {
        case 'OPENER':
        case 'REENGAGING_DAY':
        case 'REENGAGING_WEEK':
        case 'REENGAGING_MONTH':
            return CONTENT_PRIORITIES.PROFILE_PRIMARY;
        case 'EARLY_CONVO':
            return CONTENT_PRIORITIES.PROFILE_PRIMARY;
        default:
            return CONTENT_PRIORITIES.PROFILE_SECONDARY;
    }
}

function buildFallbackContext(data, conversationAnalysis) {
    const safeName = data?.theirName || 'Match';
    const safeProfile = data?.theirProfile || 'Profile not available';
    
    return `${TEMPLATES.SECTION_HEADER('BASIC CONTEXT')}
${TEMPLATES.PROFILE_CONTEXT(safeName, safeProfile)}

${TEMPLATES.CRITICAL_NOTICE('Using fallback context due to data validation error')}`;
}

