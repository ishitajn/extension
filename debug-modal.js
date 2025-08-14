// src/debug-modal.js (Final, Refined Version)

import { generatePrompts } from './prompts.js';
import { LINGUISTIC_STYLES, DATE_ARC_PHASES } from './uiHelpers.js';

/** @type {import('./conversationHelpers.js').GenerationData} */
let modalState = {};
let callbacks = {};
let currentView = 'analysis'; // Start at the new first view
const VIEWS = ['analysis', 'sexual', 'date', 'geo', 'memory', 'context', 'suggestions', 'final'];

const CONVERSATION_STATES = ['OPENER', 'EARLY_CONVO', 'ACTIVE_CONVO', 'REENGAGING_DAY', 'REENGAGING_WEEK', 'REENGAGING_MONTH'];
const INTENT_OPTIONS = ['questioning', 'planning', 'reacting_to_humor', 'storytelling', 'flirting_or_sexual'];

// --- Helper to set nested values from a string path ---
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

// --- UI Component Builders ---
function createSelect(id, dataPath, options, selectedValue) {
    const optionsHtml = options.map(opt => `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join('');
    return `<select id="${id}" data-path="${dataPath}" class="modal-input">${optionsHtml}</select>`;
}

function createMultiSelect(id, dataPath, allOptions, selectedOptions) {
    const selectedSet = new Set(selectedOptions || []);
    const optionsHtml = allOptions.map(opt => `<option value="${opt}" ${selectedSet.has(opt) ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join('');
    return `<select id="${id}" data-path="${dataPath}" class="modal-input" multiple>${optionsHtml}</select>`;
}

function createTextarea(id, dataPath, value) {
    return `<textarea id="${id}" data-path="${dataPath}" class="modal-input">${value || ''}</textarea>`;
}

function createInput(id, dataPath, value, type = 'text') {
    return `<input type="${type}" id="${id}" data-path="${dataPath}" value="${value || ''}" class="modal-input">`;
}

function createCheckbox(id, dataPath, checked) {
    return `<input type="checkbox" id="${id}" data-path="${dataPath}" ${checked ? 'checked' : ''} class="modal-input">`;
}

// FIX: Removed inline event handler to be CSP compliant.
function createSlider(id, dataPath, value, min, max, step, labelMap) {
    const getLabel = (val) => {
        const numVal = parseFloat(val);
        for (const [limit, label] of Object.entries(labelMap)) {
            if (numVal >= parseFloat(limit))
                return label;
        }
        return Object.values(labelMap)[0];
    };
    return `
        <div class="slider-container">
            <input type="range" id="${id}" data-path="${dataPath}" value="${value}" min="${min}" max="${max}" step="${step}" data-label-map='${JSON.stringify(labelMap)}'>
            <span id="${id}-value" class="value-display">${value} (${getLabel(value)})</span>
        </div>
    `;
}

function createCollapsibleJSON(title, dataObject, isEditable = true) {
    if (dataObject === null || typeof dataObject === 'undefined') {
        return `
            <div class="collapsible-json-container">
                <details class="modal-payload-details">
                    <summary>${title}</summary>
                    <pre class="raw-json-area" style="color: var(--text-muted);">Not available</pre>
                </details>
            </div>
        `;
    }

    const jsonString = JSON.stringify(dataObject, null, 2);
    const key = title.split(' ')[0].toLowerCase();
    const copyIconSVG = `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>`;

    return `
        <div class="collapsible-json-container">
            <details class="modal-payload-details">
                <summary>${title}</summary>
                <pre ${isEditable ? 'contenteditable="true"' : ''} class="raw-json-area" data-object-key="${key}">${jsonString}</pre>
            </details>
            <button class="icon-btn copy-json-btn" title="Copy JSON">
                ${copyIconSVG}
            </button>
        </div>
    `;
}

// --- View Rendering Logic ---
function renderView() {
    const contentEl = document.getElementById('debug-modal-content');
    if (!contentEl)
        return;

    let html = '';
    switch (currentView) {
    case 'analysis':
        html = renderAnalysisView();
        break;
    case 'sexual':
        html = renderSexualAnalysisView();
        break;
    case 'date':
        html = renderDateAnalysisView();
        break;
    case 'geo':
        html = renderGeoContextView();
        break;
    case 'memory':
        html = renderMemoryView();
        break;
    case 'context':
        html = renderContextView();
        break;
    case 'suggestions':
        html = renderSuggestionsView();
        break;
    case 'final':
        html = renderFinalPayloadView();
        break;
    }
    contentEl.innerHTML = html;
    attachEventListeners();
}

function renderAnalysisView() {
    const { conversationAnalysis } = modalState;
    const { lastMessageAnalysis } = conversationAnalysis;
    const valenceLabels = {
        '-1': 'Very Negative',
        '-0.5': 'Negative',
        '-0.1': 'Neutral',
        '0.5': 'Positive',
        '1': 'Very Positive'
    };
    const arousalLabels = {
        '-1': 'Bored/Calm',
        '-0.5': 'Low Energy',
        '-0.1': 'Neutral',
        '0.5': 'Excited',
        '1': 'Agitated'
    };

    return `
        <h3>View 1: Conversation Analysis</h3>
        <table class="payload-table">
            <tr><td>Conversation State</td><td>${createSelect('analysis-state', 'conversationAnalysis.conversationState', CONVERSATION_STATES, conversationAnalysis.conversationState)}</td></tr>
            <tr><td>Suppress Greeting?</td><td>${createCheckbox('analysis-suppressGreeting', 'conversationAnalysis.suppressGreeting', conversationAnalysis.suppressGreeting)}</td></tr>
            <tr><td colspan="2" style="text-align:center; background:#333;"><strong>Last Message Subtext</strong></td></tr>
            <tr><td>Is Direct Question?</td><td>${createCheckbox('subtext-isDirectQuestion', 'conversationAnalysis.lastMessageAnalysis.isDirectQuestion', lastMessageAnalysis.isDirectQuestion)}</td></tr>
            <tr><td>Is Low Effort?</td><td>${createCheckbox('subtext-isLowEffort', 'conversationAnalysis.lastMessageAnalysis.isLowEffort', lastMessageAnalysis.isLowEffort)}</td></tr>
            <tr><td>Is Sarcastic?</td><td>${createCheckbox('subtext-isSarcastic', 'conversationAnalysis.lastMessageAnalysis.isSarcastic', lastMessageAnalysis.isSarcastic)}</td></tr>
            <tr><td>Is Ambiguous?</td><td>${createCheckbox('subtext-isAmbiguous', 'conversationAnalysis.lastMessageAnalysis.isAmbiguous', lastMessageAnalysis.isAmbiguous)}</td></tr>
            <tr><td>Is Vulnerable?</td><td>${createCheckbox('subtext-isVulnerable', 'conversationAnalysis.lastMessageAnalysis.isVulnerable', lastMessageAnalysis.isVulnerable)}</td></tr>
            <tr><td>Valence</td><td>${createSlider('subtext-valence', 'conversationAnalysis.lastMessageAnalysis.valence', lastMessageAnalysis.valence, -1, 1, 0.1, valenceLabels)}</td></tr>
            <tr><td>Arousal</td><td>${createSlider('subtext-arousal', 'conversationAnalysis.lastMessageAnalysis.arousal', lastMessageAnalysis.arousal, -1, 1, 0.1, arousalLabels)}</td></tr>
            <tr><td>Intents</td><td>${createMultiSelect('subtext-intents', 'conversationAnalysis.lastMessageAnalysis.intents', INTENT_OPTIONS, lastMessageAnalysis.intents)}</td></tr>
        </table>
        ${createCollapsibleJSON('View/Edit Raw Analysis Object', conversationAnalysis)}
    `;
}

function renderSexualAnalysisView() {
    const { sexualAnalysis } = modalState;
    if (!sexualAnalysis) return '<h3>View 2: Sexual Analysis</h3><p>Not available.</p>';

    const tensionLabels = { 0: 'None', 0.5: 'Subtle', 0.8: 'High', 1: 'Intense' };
    const confidenceLabels = { 0: 'None', 0.5: 'Maybe', 0.8: 'Likely', 1: 'Certain' };
    const paceOptions = ['slow', 'moderate', 'fast'];
    const styleOptions = ['direct_and_explicit', 'playful_and_teasing', 'romantic_and_sensual'];
    const suggestionOptions = ['match_and_escalate', 'redirect_to_romance', 'clarify_and_respect_boundary'];
    const archetypeOptions = ['The Romantic', 'The Adventurer', 'The Intellectual Seducer'];

    return `
        <h3>View 2: Sexual Analysis</h3>
        <table class="payload-table">
            <tr><td>Sexual Tension</td><td>${createSlider('sexual-tension', 'sexualAnalysis.sexualTensionScore', sexualAnalysis.sexualTensionScore, 0, 1, 0.1, tensionLabels)}</td></tr>
            <tr><td>Intent Confidence</td><td>${createSlider('sexual-confidence', 'sexualAnalysis.sexualIntentConfidence', sexualAnalysis.sexualIntentConfidence, 0, 1, 0.1, confidenceLabels)}</td></tr>
            <tr><td>Escalation Pace</td><td>${createSelect('sexual-pace', 'sexualAnalysis.escalationPace', paceOptions, sexualAnalysis.escalationPace)}</td></tr>
            <tr><td>Dominant/Submissive</td><td>${createSlider('sexual-domsub', 'sexualAnalysis.dominantSubmissiveScore', sexualAnalysis.dominantSubmissiveScore, -1, 1, 0.1, { '-1': 'Submissive', 0: 'Neutral', 1: 'Dominant' })}</td></tr>
            <tr><td>Communication Style</td><td>${createSelect('sexual-style', 'sexualAnalysis.sexualCommunicationStyle', styleOptions, sexualAnalysis.sexualCommunicationStyle)}</td></tr>
            <tr><td>Response Suggestion</td><td>${createSelect('sexual-suggestion', 'sexualAnalysis.sexualResponseSuggestion', suggestionOptions, sexualAnalysis.sexualResponseSuggestion)}</td></tr>
            <tr><td>Sexual Archetype</td><td>${createSelect('sexual-archetype', 'sexualAnalysis.sexualArchetype', archetypeOptions, sexualAnalysis.sexualArchetype)}</td></tr>
        </table>
        ${createCollapsibleJSON('View/Edit Raw Sexual Analysis', sexualAnalysis)}
    `;
}

function renderDateAnalysisView() {
    const { dateAnalysis } = modalState;
    if (!dateAnalysis) return '<h3>View 3: Date Analysis</h3><p>Not available.</p>';

    const commitmentOptions = ['tentative', 'confirmed', 'imminent'];
    const dateTypeOptions = ['coffee_date', 'dinner_and_drinks', 'casual_hangout'];
    const vibeOptions = ['romantic', 'adventurous', 'intellectual'];
    const initiatorOptions = ['user', 'match', 'mutual'];

    return `
        <h3>View 3: Date Analysis</h3>
        <table class="payload-table">
            <tr><td>Date Planned?</td><td>${createCheckbox('date-isPlanned', 'dateAnalysis.isDatePlanned', dateAnalysis.isDatePlanned)}</td></tr>
            <tr><td>Commitment Level</td><td>${createSelect('date-commitment', 'dateAnalysis.dateCommitmentLevel', commitmentOptions, dateAnalysis.dateCommitmentLevel)}</td></tr>
            <tr><td>Venue</td><td>${createInput('date-venue', 'dateAnalysis.dateLogistics.venue', dateAnalysis.dateLogistics.venue)}</td></tr>
            <tr><td>Time (ISO)</td><td>${createInput('date-time', 'dateAnalysis.dateLogistics.time', dateAnalysis.dateLogistics.time)}</td></tr>
            <tr><td>Date Type</td><td>${createSelect('date-type', 'dateAnalysis.dateType', dateTypeOptions, dateAnalysis.dateType)}</td></tr>
            <tr><td>Date Vibe</td><td>${createSelect('date-vibe', 'dateAnalysis.dateVibe', vibeOptions, dateAnalysis.dateVibe)}</td></tr>
            <tr><td>Is Virtual?</td><td>${createCheckbox('date-isVirtual', 'dateAnalysis.isVirtual', dateAnalysis.isVirtual)}</td></tr>
            <tr><td>Who Initiated?</td><td>${createSelect('date-initiator', 'dateAnalysis.whoInitiated', initiatorOptions, dateAnalysis.whoInitiated)}</td></tr>
        </table>
        ${createCollapsibleJSON('View/Edit Raw Date Analysis', dateAnalysis)}
    `;
}

function renderGeoContextView() {
    const { geoContext } = modalState;
    if (!geoContext) return '<h3>View 4: Geo Context</h3><p>Not available.</p>';

    return `
        <h3>View 4: Geo Context</h3>
        <table class="payload-table">
            <tr><td colspan="2" style="text-align:center; background:#333;"><strong>User Location</strong></td></tr>
            <tr><td>Latitude</td><td>${createInput('geo-user-lat', 'geoContext.userLocation.lat', geoContext.userLocation.lat, 'number')}</td></tr>
            <tr><td>Longitude</td><td>${createInput('geo-user-lon', 'geoContext.userLocation.lon', geoContext.userLocation.lon, 'number')}</td></tr>
            <tr><td>Timezone</td><td>${createInput('geo-user-tz', 'geoContext.userLocation.timeZone', geoContext.userLocation.timeZone)}</td></tr>
            <tr><td colspan="2" style="text-align:center; background:#333;"><strong>Match Location</strong></td></tr>
            <tr><td>Latitude</td><td>${createInput('geo-match-lat', 'geoContext.matchLocation.lat', geoContext.matchLocation.lat, 'number')}</td></tr>
            <tr><td>Longitude</td><td>${createInput('geo-match-lon', 'geoContext.matchLocation.lon', geoContext.matchLocation.lon, 'number')}</td></tr>
            <tr><td>Timezone</td><td>${createInput('geo-match-tz', 'geoContext.matchLocation.timeZone', geoContext.matchLocation.timeZone)}</td></tr>
        </table>
        ${createCollapsibleJSON('View/Edit Raw Geo Context', geoContext)}
    `;
}

function renderMemoryView() {
    const { memory } = modalState.conversationAnalysis;
    return `
        <h3>View 2: Match Memory</h3>
        <table class="payload-table">
            <tr><td>Date Arc Phase</td><td>${createSelect('memory-dateArcPhase', 'conversationAnalysis.memory.dateArcPhase', DATE_ARC_PHASES, memory.dateArcPhase)}</td></tr>
            <tr><td>Inside Jokes (one per line)</td><td>${createTextarea('memory-insideJokes', 'conversationAnalysis.memory.insideJokes', (memory.insideJokes || []).join('\n'))}</td></tr>
            <tr><td>Avoided Topics (one per line)</td><td>${createTextarea('memory-avoidedTopics', 'conversationAnalysis.memory.avoidedTopics', (memory.avoidedTopics || []).join('\n'))}</td></tr>
            <tr><td>Question History (one per line)</td><td>${createTextarea('memory-questionHistory', 'conversationAnalysis.memory.questionHistory', (memory.questionHistory || []).join('\n'))}</td></tr>
        </table>
        ${createCollapsibleJSON('View/Edit Raw Memory Object', memory)}
    `;
}

function renderContextView() {
    const { conversationHistory } = modalState;
    const historyHtml = conversationHistory.map((msg, index) => `
        <div class="message-card" data-index="${index}">
            <div class="message-card-header">
                <select class="modal-input" data-path="conversationHistory.${index}.role">
                    <option value="user" ${msg.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="assistant" ${msg.role === 'assistant' ? 'selected' : ''}>Assistant</option>
                </select>
                <button class="icon-btn remove-msg-btn" title="Remove Message">&times;</button>
            </div>
            <div class="message-card-content">
                <textarea class="modal-input" data-path="conversationHistory.${index}.content">${msg.content}</textarea>
            </div>
        </div>
    `).join('');

    return `
        <h3>View 3: Profiles & History</h3>
        <table class="payload-table">
            <tr><td>My Name</td><td>${createInput('context-myName', 'myName', modalState.myName)}</td></tr>
            <tr><td>Their Name</td><td>${createInput('context-theirName', 'theirName', modalState.theirName)}</td></tr>
            <tr><td>My Profile</td><td>${createTextarea('context-myProfile', 'myProfile', modalState.myProfile)}</td></tr>
            <tr><td>Their Profile</td><td>${createTextarea('context-theirProfile', 'theirProfile', modalState.theirProfile)}</td></tr>
            <tr><td>Force Geo-Context?</td><td>${createCheckbox('context-forceIncludeGeoContext', 'forceIncludeGeoContext', modalState.forceIncludeGeoContext)}</td></tr>
        </table>
        <h4>Conversation History</h4>
        <div class="messages-container">${historyHtml}</div>
        <button id="add-message-btn" class="btn btn-secondary add-message-btn">Add Message</button>
        ${createCollapsibleJSON('View/Edit Raw GeoContext Data', modalState.geoContextData)}
    `;
}

function renderSuggestionsView() {
    const { responseSuggestions } = modalState;
    if (!responseSuggestions) return '<h3>View 7: Response Suggestions</h3><p>Not available.</p>';

    const styleOptions = LINGUISTIC_STYLES;
    const emojiOptions = ['auto', 'friendly', 'playful', 'bold', 'no_emoji'];
    const nextActionOptions = ['ask_for_date', 'build_rapport', 'clarify_intent', 'escalate_sexually'];

    return `
        <h3>View 7: Response Suggestions</h3>
        <table class="payload-table">
            <tr><td>Suggested Length</td><td>${createInput('suggestions-length', 'responseSuggestions.length', responseSuggestions.length, 'number')}</td></tr>
            <tr><td>Suggested Tone</td><td>${createInput('suggestions-tone', 'responseSuggestions.tone', responseSuggestions.tone, 'number')}</td></tr>
            <tr><td>Suggested Style</td><td>${createSelect('suggestions-style', 'responseSuggestions.linguisticStyle', styleOptions, responseSuggestions.linguisticStyle)}</td></tr>
            <tr><td>Suggested Emoji</td><td>${createSelect('suggestions-emoji', 'responseSuggestions.emojiStrategy', emojiOptions, responseSuggestions.emojiStrategy)}</td></tr>
            <tr><td>End with Question?</td><td>${createCheckbox('suggestions-endWithQuestion', 'responseSuggestions.endWithQuestion', responseSuggestions.endWithQuestion)}</td></tr>
            <tr><td>Suggested Next Action</td><td>${createSelect('suggestions-nextAction', 'responseSuggestions.suggestedNextAction', nextActionOptions, responseSuggestions.suggestedNextAction)}</td></tr>
            <tr><td>Key Talking Points (one per line)</td><td>${createTextarea('suggestions-talkingPoints', 'responseSuggestions.keyTalkingPoints', (responseSuggestions.keyTalkingPoints || []).join('\n'))}</td></tr>
        </table>
        ${createCollapsibleJSON('View/Edit Raw Suggestions', responseSuggestions)}
    `;
}

function renderFinalPayloadView() {
    const { systemMessage, userMessage } = generatePrompts(modalState);
    const finalPayload = {
        messages: [{
                role: "system",
                content: systemMessage
            }, {
                role: "user",
                content: userMessage
            }
        ],
        temperature: modalState.taskInstructions.temperature,
        top_p: modalState.taskInstructions.top_p
    };
    modalState.finalPayload = finalPayload;

    return `
        <h3>View 4: Final Payload Review</h3>
        <p>This is the exact data that will be sent to the AI. You can make final edits to the messages below.</p>
        <div class="messages-container">
            <div class="message-card">
                <div class="message-card-header"><strong>System Message</strong></div>
                <div class="message-card-content">${createTextarea('final-system', 'finalPayload.messages.0.content', systemMessage)}</div>
            </div>
            <div class="message-card">
                <div class="message-card-header"><strong>User Message</strong></div>
                <div class="message-card-content">${createTextarea('final-user', 'finalPayload.messages.1.content', userMessage)}</div>
            </div>
        </div>
        ${createCollapsibleJSON('View/Edit Raw Final Payload', finalPayload, false)}
    `;
}

// --- State Management & Event Handling ---
function updateStateFromUI(e) {
    const el = e.target;
    const path = el.dataset.path;
    if (!path)
        return;

    let value;
    if (el.type === 'checkbox') {
        value = el.checked;
    } else if (el.type === 'range' || el.type === 'number') {
        value = parseFloat(el.value);
    } else if (el.multiple) {
        value = Array.from(el.selectedOptions).map(opt => opt.value);
    } else {
        value = el.value;
    }

    if (path.endsWith('insideJokes') || path.endsWith('avoidedTopics') || path.endsWith('questionHistory')) {
        value = el.value.split('\n').filter(Boolean);
    }

    setNestedValue(modalState, path, value);

    const objectKey = path.split('.')[0];
    if (objectKey === 'conversationAnalysis') {
        updateRawJsonDisplay('analysis');
        if (path.includes('memory')) {
            updateRawJsonDisplay('memory');
        }
    } else if (objectKey === 'finalPayload') {
        updateRawJsonDisplay('final');
    }
}

function updateRawJsonDisplay(key) {
    const pre = document.querySelector(`.raw-json-area[data-object-key="${key}"]`);
    if (!pre)
        return;

    let objectToDisplay;
    switch (key) {
    case 'analysis':
        objectToDisplay = modalState.conversationAnalysis;
        break;
    case 'sexual':
        objectToDisplay = modalState.sexualAnalysis;
        break;
    case 'date':
        objectToDisplay = modalState.dateAnalysis;
        break;
    case 'geo':
        objectToDisplay = modalState.geoContext;
        break;
    case 'memory':
        objectToDisplay = modalState.conversationAnalysis.memory;
        break;
    case 'suggestions':
        objectToDisplay = modalState.responseSuggestions;
        break;
    case 'final':
        objectToDisplay = modalState.finalPayload;
        break;
    default:
        return;
    }
    pre.textContent = JSON.stringify(objectToDisplay, null, 2);
}

function attachEventListeners() {
    const contentEl = document.getElementById('debug-modal-content');
    contentEl.addEventListener('input', updateStateFromUI);
    contentEl.addEventListener('change', updateStateFromUI);

    // FIX: Attach event listener for sliders programmatically
    contentEl.querySelectorAll('input[type="range"][data-label-map]').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const targetSlider = e.currentTarget;
            const valueDisplay = document.getElementById(`${targetSlider.id}-value`);
            if (valueDisplay) {
                const labelMap = JSON.parse(targetSlider.dataset.labelMap);
                const currentValue = targetSlider.value;
                const getLabel = (val) => {
                    const numVal = parseFloat(val);
                    for (const [limit, label] of Object.entries(labelMap)) {
                        if (numVal >= parseFloat(limit)) return label;
                    }
                    return Object.values(labelMap)[0];
                };
                valueDisplay.textContent = `${currentValue} (${getLabel(currentValue)})`;
            }
        });
    });

    document.querySelectorAll('.copy-json-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const button = e.currentTarget;
            const container = button.closest('.collapsible-json-container');
            if (!container)
                return;

            const pre = container.querySelector('pre.raw-json-area');
            if (!pre)
                return;

            const textToCopy = pre.textContent.replace(/\\n/g, '\n');

            navigator.clipboard.writeText(textToCopy);

            const originalIcon = button.innerHTML;
            button.innerHTML = '✅';
            button.disabled = true;
            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.disabled = false;
            }, 1500);
        });
    });

    document.querySelectorAll('.raw-json-area[contenteditable="true"]').forEach(area => {
        area.addEventListener('blur', e => {
            try {
                const newJson = JSON.parse(e.target.textContent);
                const key = e.target.dataset.objectKey;
                if (key === 'memory') {
                    modalState.conversationAnalysis.memory = newJson;
                } else if (key === 'analysis') {
                    modalState.conversationAnalysis = newJson;
                } else {
                    modalState[key] = newJson;
                }
                renderView();
            } catch (err) {
                console.error("Invalid JSON entered:", err);
                e.target.style.border = '1px solid red';
            }
        });
        area.addEventListener('focus', e => {
            e.target.style.border = '';
        });
    });

    if (currentView === 'context') {
        document.getElementById('add-message-btn')?.addEventListener('click', () => {
            modalState.conversationHistory.push({
                role: 'user',
                content: '',
                date: new Date().toISOString().split('T')[0]
            });
            renderView();
        });
        document.querySelectorAll('.remove-msg-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const index = e.currentTarget.closest('.message-card').dataset.index;
                modalState.conversationHistory.splice(index, 1);
                renderView();
            });
        });
    }
}

// --- Main Modal Functions ---
function handleNav(direction) {
    const currentIndex = VIEWS.indexOf(currentView);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= VIEWS.length)
        return;
    currentView = VIEWS[nextIndex];
    renderView();
    updateNavButtons();
}

function updateNavButtons() {
    const currentIndex = VIEWS.indexOf(currentView);
    document.getElementById('modal-back-btn').disabled = currentIndex === 0;

    const primaryBtn = document.getElementById('modal-primary-action-btn');
    primaryBtn.textContent = (currentIndex === VIEWS.length - 1) ? 'Send to AI' : 'Next';
}

/**
 * @param {import('./conversationHelpers.js').GenerationData} initialData
 * @param {object} cbs
 */
export function showNlpModal(initialData, cbs) {
    callbacks = cbs;
    modalState = JSON.parse(JSON.stringify(initialData));
    currentView = 'analysis';

    const overlay = document.getElementById('debug-modal-overlay');
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">Debug & Override Mode</div>
            <div class="modal-content" id="debug-modal-content"></div>
            <div class="modal-footer">
                <div class="modal-actions">
                    <button id="modal-cancel-btn" class="btn btn-secondary">Cancel</button>
                    <button id="modal-back-btn" class="btn btn-secondary">Back</button>
                    <button id="modal-primary-action-btn" class="btn btn-primary">Next</button>
                </div>
            </div>
        </div>
    `;
    overlay.classList.remove('hidden');

    document.getElementById('modal-cancel-btn').addEventListener('click', callbacks.hideDebugModal);
    document.getElementById('modal-back-btn').addEventListener('click', () => handleNav(-1));
    document.getElementById('modal-primary-action-btn').addEventListener('click', () => {
        if (currentView === 'final') {
            callbacks.setUIGeneratingState(true);
            callbacks.startTimer(Date.now());
            callbacks.hideDebugModal();
            callbacks.sendFinalPayloadToAI(modalState.finalPayload);
        } else {
            handleNav(1);
        }
    });

    renderView();
    updateNavButtons();
}

export function hideDebugModal() {
    const overlay = document.getElementById('debug-modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
    }
}