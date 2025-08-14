// src/uiConfig.js

export const UI_CONFIG = {
    flirtySlider: {
        id: 'flirty-slider',
        type: 'slider',
        storageKey: 'flirtyValue',
        defaultValue: 60,
    },
    lengthSlider: {
        id: 'length-slider',
        type: 'slider',
        storageKey: 'lengthValue',
        defaultValue: 30,
    },
    linguisticStyleSelect: {
        id: 'linguistic-style-select',
        type: 'select',
        storageKey: 'linguisticStyle',
        defaultValue: 'auto',
        options: ['auto', 'casual', 'charming', 'direct', 'intellectual', 'mysterious', 'playful', 'poetic', 'sarcastic', 'sexual', 'witty']
    },
    emojiStrategySelect: {
        id: 'emoji-strategy-select',
        type: 'select',
        storageKey: 'emojiStrategy',
        defaultValue: 'no_emoji',
        options: { 'auto': 'Auto (Recommended)', 'friendly': 'Friendly', 'playful': 'Playful', 'bold': 'Bold', 'no_emoji': 'No Emoji' }
    },
    temperatureSlider: {
        id: 'temperature-slider',
        type: 'slider',
        storageKey: 'modelTemperature',
        defaultValue: 0.5,
    },
    topPSlider: {
        id: 'top-p-slider',
        type: 'slider',
        storageKey: 'topPValue',
        defaultValue: 1.0,
    },
    questionToggleCheckbox: {
        id: 'question-toggle-checkbox',
        type: 'checkbox',
        storageKey: 'endWithQuestion',
        defaultValue: false,
    },
    geoContextToggle: {
        id: 'geo-context-toggle',
        type: 'checkbox',
        storageKey: 'geoContextToggle',
        defaultValue: true,
    },
    newTopicToggle: {
        id: 'new-topic-toggle',
        type: 'checkbox',
        storageKey: 'newTopic',
        defaultValue: false,
    },
    strictGoalToggle: {
        id: 'strict-goal-toggle',
        type: 'checkbox',
        storageKey: 'strictGoalOverride',
        defaultValue: false,
    },
    debugModeToggle: {
        id: 'debug-mode-toggle',
        type: 'checkbox',
        storageKey: 'debugModeEnabled',
        defaultValue: false,
    },
    useEnhancedNlp: {
        id: 'use-enhanced-nlp-toggle',
        type: 'checkbox',
        storageKey: 'useEnhancedNlp',
        defaultValue: false,
    },
    // Non-UI settings that still need a home
    nlpUrl: { id: 'nlpUrl', storageKey: 'nlp_url', defaultValue: 'http://localhost:8081/nlp' },
    localLlamaUrl: { id: 'localLlamaUrl', storageKey: 'local_llama_url', defaultValue: 'http://localhost:8080/v1/chat/completions' },
    localModelName: { id: 'localModelName', storageKey: 'local_model_name', defaultValue: 'llama3:latest' },
    localLlamaApiKey: { id: 'localLlamaApiKey', storageKey: 'local_llama_api_key', defaultValue: '' },
    userLocationSelect: { id: 'user-location-select', storageKey: 'userLocationChoice', defaultValue: 'autodetect' },
    myProfileSetting: { id: 'my-profile-setting', storageKey: 'myProfile', defaultValue: `Jay, 35 – 6'0", Vice President at a financial institution, graduate degree from Illinois State University. Driven and grounded, with a strong career focus but a playful side—loves trying new cuisines and cooking for others. Enjoys occasional adventure, meaningful conversations, and believes in making a difference through small actions. Social drinker, non-smoker, exercises sometimes. Prefers genuine connection and meeting in person over endless chatting.` },
    customInstruction: { id: 'custom-instruction', storageKey: 'customInstruction', defaultValue: '' },
    responseArea: { id: 'response-area', storageKey: 'lastResponse', defaultValue: '' }
};

// --- Single Source of Truth for Defaults ---
export const DEFAULTS = Object.fromEntries(
    Object.values(UI_CONFIG).map(config => [config.storageKey, config.defaultValue])
);

export const USER_LOCATIONS = {
    'autodetect': {
        name: 'Auto-Detect Location'
    },
    'charlotte': {
        name: 'Charlotte, NC, USA',
        lat: 35.2271,
        lon: -80.8431,
        timeZone: 'America/New_York',
        country: 'United States'
    },
    'nyc': {
        name: 'New York, NY, USA',
        lat: 40.7128,
        lon: -74.0060,
        timeZone: 'America/New_York',
        country: 'United States'
    },
    'la': {
        name: 'Los Angeles, CA, USA',
        lat: 34.0522,
        lon: -118.2437,
        timeZone: 'America/Los_Angeles',
        country: 'United States'
    },
    'london': {
        name: 'London, UK',
        lat: 51.5072,
        lon: -0.1276,
        timeZone: 'Europe/London',
        country: 'United Kingdom'
    },
    'sydney': {
        name: 'Sydney, Australia',
        lat: -33.8688,
        lon: 151.2093,
        timeZone: 'Australia/Sydney',
        country: 'Australia'
    },
};
