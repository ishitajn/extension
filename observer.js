// observer.js - Watches for new messages and notifies the background script.

console.log('[Wingman Observer] Script injected.');

// Debounce timeout
let notificationTimeout;

function setupObserver() {
    const TINDER_CHAT_LOG_SELECTOR = 'div[role="log"]';
    const BUMBLE_CHAT_LOG_SELECTOR = '[data-qa-role="message-list"]';
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
                        // Ensure it's an element node and it's a message from the match
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches(matchMessageSelector)) {
                            console.log('[Wingman Observer] New message from match detected.');

                            // Debounce the notification to avoid spamming on rapid messages
                            clearTimeout(notificationTimeout);
                            notificationTimeout = setTimeout(() => {
                                chrome.runtime.sendMessage({ type: 'PROACTIVE_ANALYSIS_REQUEST' });
                            }, 1000); // Wait 1 second before sending
                        }
                    });
                }
            }
        });

        observer.observe(chatLogNode, { childList: true, subtree: true });
        console.log('[Wingman Observer] Observer is now watching the chat log.');
    } else {
        console.warn('[Wingman Observer] Could not find chat log element on this page.');
    }
}

// The chat log might not be present on initial script injection.
// We'll use a timer to try and find it a few times.
let attempts = 0;
const maxAttempts = 5;
const interval = setInterval(() => {
    if (document.querySelector('[data-qa-role="message-list"]') || document.querySelector('div[role="log"]')) {
        clearInterval(interval);
        setupObserver();
    } else {
        attempts++;
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn('[Wingman Observer] Chat log not found after multiple attempts.');
        }
    }
}, 2000);
