export const LINGUISTIC_STYLES = ['auto', 'casual', 'charming', 'direct', 'intellectual', 'mysterious', 'playful', 'poetic', 'sarcastic', 'sexual', 'witty'].sort((a, b) => a === 'auto' ? -1 : b === 'auto' ? 1 : a.localeCompare(b));
export const DATE_ARC_PHASES = ['rapport', 'escalation', 'planning'];

export function getToneDescription(value) {
    const levels = {
        100: 'Be explicitly sexual and daring.',
        90: 'Be intensely flirty and bold.',
        80: 'Be very flirty and confident.',
        70: 'Be flirty and playful.',
        60: 'Be moderately flirty and engaging.',
        50: 'Be lightly flirty and casually engaging.',
        40: 'Be friendly and approachable.',
        30: 'Be warm and relaxed.',
        20: 'Be polite and friendly.',
        10: 'Be polite and straightforward.',
        0: 'Be completely neutral and formal.'
    };
    return levels[Object.keys(levels).reverse().find(k => value >= k) || 0];
}

export function getLengthDescription(value) {
    const levels = {
        100: 'Strictly 8+ sentences (a manifesto).',
        90: 'Strictly 6–7 sentences (epic).',
        80: 'Strictly 5–6 sentences (very long).',
        70: 'Strictly 4–5 sentences (long).',
        60: 'Strictly 3–4 sentences (moderately long).',
        50: 'Strictly 2–3 sentences (medium).',
        40: 'Strictly 2 sentences (moderately short).',
        30: 'Strictly 1–2 sentences (short).',
        20: 'Strictly one full sentence (very short).',
        10: 'Strictly 5–10 words (ultra short).',
        0: 'Strictly 2–5 words (micro).'
    };
    return levels[Object.keys(levels).reverse().find(k => value >= k) || 0];
}

export function getStyleDescription(style, analysis) {
    if (style === 'auto' && analysis?.lastMessageAnalysis?.suggestedResponseStyle) {
        return `Strictly adopt a ${analysis.lastMessageAnalysis.suggestedResponseStyle} style.`;
    }
    const styles = {
        'witty': 'Write with a witty and humorous style.',
        'intellectual': 'Write with an intellectual and deep style.',
        'playful': 'Write with a playful and teasing style.',
        'direct': 'Write with a direct and confident style.',
        'poetic': 'Write with a poetic and romantic style.',
        'sexual': 'Write with a bold, provocative and sexual style.',
        'sarcastic': 'Write with a sarcastic and sharp style.',
        'charming': 'Write with a charming and suave style.',
        'casual': 'Write with a casual and laid-back style.',
        'mysterious': 'Write with a mysterious and intriguing style.'
    };
    return styles[style] || 'Write with a natural and conversational style.';
}

export function getEmojiInstruction(strategy, flirtyValue, linguisticStyle) {
    if (!strategy || strategy === 'no_emoji')
        return '';
    const autoDesc = () => {
        if (['intellectual', 'poetic', 'sarcastic'].includes(linguisticStyle))
            return 'Avoid emojis almost entirely.';
        if (flirtyValue >= 80)
            return 'Feel free to use 1-3 bold or suggestive emojis (e.g., 😏, 😈, 🔥).';
        if (flirtyValue >= 60)
            return 'Incorporate one or two well-placed, playful emojis (e.g., 😉, 😂, 😜).';
        if (flirtyValue >= 40)
            return 'You may use a single, simple, and friendly emoji (e.g., 🙂, 👍).';
        if (['playful', 'witty', 'charming'].includes(linguisticStyle))
            return 'You can use one well-placed emoji to add personality.';
        return 'Be very conservative with emojis.';
    };
    const map = {
        'auto': autoDesc(),
        'friendly': 'You may use a single, simple, and friendly emoji (e.g., 🙂, 👍).',
        'playful': 'Incorporate one or two well-placed, playful emojis (e.g., 😉, 😂).',
        'bold': 'Feel free to use 1-3 bold or suggestive emojis (e.g., 😏, 😈, 🔥).'
    };
    return map[strategy] || '';
}

export function getTimeContext() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    let dayPeriod = hour < 5 ? 'late night' : hour < 8 ? 'early morning' : hour < 12 ? 'morning' : hour < 14 ? 'afternoon' : hour < 17 ? 'late afternoon' : hour < 19 ? 'evening' : hour < 22 ? 'late evening' : 'night';
    if (day === 0 || day === 6 || (day === 5 && hour >= 17)) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        return `It's the weekend, ${dayName}(${dayPeriod}). You can use a more relaxed, fun-oriented greeting.`;
    }
    if (day >= 1 && day <= 5) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
        return `It's a weekday, ${dayName} - ${dayPeriod}. A casual check-in about their day or a light greeting (e.g., "Happy ${dayName}!") is appropriate.`;
    }
    return null;
}
