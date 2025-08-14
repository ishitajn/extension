// src/uiConfig.js

export const UI_CONFIG = {
    flirtySlider: {
        id: 'flirty-slider',
        type: 'slider',
        defaultValue: 60,
        displayName: 'Flirt Level',
        description: 'Controls the level of flirtatiousness in the generated message.',
        range: { min: 0, max: 100, step: 10 },
        labelMap: { 0: 'Neutral', 20: 'Friendly', 40: 'Warm', 60: 'Flirty', 80: 'Very Flirty', 100: 'Daring' }
    },
    lengthSlider: {
        id: 'length-slider',
        type: 'slider',
        defaultValue: 30,
        displayName: 'Length',
        description: 'Controls the length of the generated message.',
        range: { min: 0, max: 100, step: 10 },
        labelMap: { 0: 'Micro', 20: 'Short', 40: 'Medium', 60: 'Long', 80: 'Epic', 100: 'Manifesto' }
    },
    linguisticStyleSelect: {
        id: 'linguistic-style-select',
        type: 'select',
        defaultValue: 'auto',
        displayName: 'Linguistic Style',
        description: 'Controls the linguistic style of the generated message.',
        options: ['auto', 'casual', 'charming', 'direct', 'intellectual', 'mysterious', 'playful', 'poetic', 'sarcastic', 'sexual', 'witty']
    },
    emojiStrategySelect: {
        id: 'emoji-strategy-select',
        type: 'select',
        defaultValue: 'no_emoji',
        displayName: 'Emoji Strategy',
        description: 'Controls the use of emojis in the generated message.',
        options: {
            'auto': 'Auto (Recommended)',
            'friendly': 'Friendly',
            'playful': 'Playful',
            'bold': 'Bold',
            'no_emoji': 'No Emoji'
        }
    },
    temperatureSlider: {
        id: 'temperature-slider',
        type: 'slider',
        defaultValue: 0.5,
        displayName: 'Creativity',
        description: 'Controls the creativity of the AI. Higher values are more creative but less predictable.',
        range: { min: 0, max: 2, step: 0.1 }
    },
    topPSlider: {
        id: 'top-p-slider',
        type: 'slider',
        defaultValue: 1.0,
        displayName: 'Focus',
        description: 'Controls the focus of the AI. Lower values are more focused and less random.',
        range: { min: 0, max: 1, step: 0.05 }
    },
    questionToggleCheckbox: {
        id: 'question-toggle-checkbox',
        type: 'checkbox',
        defaultValue: false,
        displayName: 'End w/ Question',
        description: 'If checked, the AI will try to end the message with a question.'
    },
    geoContextToggle: {
        id: 'geo-context-toggle',
        type: 'checkbox',
        defaultValue: true,
        displayName: 'Use Geo-context',
        description: 'If checked, the AI will use geographical context in its response.'
    },
    newTopicToggle: {
        id: 'new-topic-toggle',
        type: 'checkbox',
        defaultValue: false,
        displayName: 'Start Fresh',
        description: 'If checked, the AI will ignore the last message and start a new topic.'
    },
    strictGoalToggle: {
        id: 'strict-goal-toggle',
        type: 'checkbox',
        defaultValue: false,
        displayName: 'Strict Goal',
        description: 'If checked, the AI will strictly adhere to the custom instructions.'
    },
    debugModeToggle: {
        id: 'debug-mode-toggle',
        type: 'checkbox',
        defaultValue: false,
        displayName: 'Debug',
        description: 'If checked, the debug modal will be shown before generating a response.'
    },
    useEnhancedNlp: {
        id: 'use-enhanced-nlp-toggle',
        type: 'checkbox',
        defaultValue: false,
        displayName: 'Use Enhanced NLP',
        description: 'If checked, a more advanced NLP model will be used (if available).'
    }
};
