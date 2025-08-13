console.log('[Wingman Observer] Script injected.');

const TINDER_CHAT_LOG_SELECTOR = 'div[role="log"]';
const BUMBLE_CHAT_LOG_SELECTOR = '[data-qa-role="message-list"]';
// This selector needs to be specific to the MATCH's messages to avoid self-triggering.
const TINDER_MATCH_MESSAGE_SELECTOR = 'div[role="article"]:not(.Ta\\(e\\))';
const BUMBLE_MATCH_MESSAGE_SELECTOR = '.message--in';

let chatLogNode = null;
let matchMessageSelector = '';

if (window.location.href.includes('tinder.com')) {
    chatLogNode = document.querySelector(TINDER_CHAT_LOG_SELECTOR);
    matchMessageSelector = TINDER_MATCH_MESSAGE_SELECTOR;
} else if (window.location.href.includes('bumble.com')) {
    chatLogNode = document.querySelector(BUMBLE_CHAT_LOG_SELECTOR);
    matchMessageSelector = BUMBLE_MATCH_MESSAGE_SELECTOR;
}

if (chatLogNode) {
    console.log('[Wingman Observer] Chat log found. Attaching MutationObserver.');

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node is an element and matches the selector for a match's message
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches(matchMessageSelector)) {
                        console.log('[Wingman Observer] New message from match detected.');

                        // Debounce the notification to avoid spamming if multiple nodes are added at once
                        clearTimeout(window.wingmanObserverTimeout);
                        window.wingmanObserverTimeout = setTimeout(() => {
                            chrome.runtime.sendMessage({ type: 'PROACTIVE_ANALYSIS_REQUEST' });
                        }, 500);
                    }
                });
            }
        }
    });

    observer.observe(chatLogNode, { childList: true, subtree: true });

} else {
    console.warn('[Wingman Observer] Could not find chat log element on this page.');
}
