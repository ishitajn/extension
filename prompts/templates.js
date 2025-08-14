
// src/prompts/templates.js
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