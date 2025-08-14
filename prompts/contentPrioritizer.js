// src/prompts/contentPrioritizer.js
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