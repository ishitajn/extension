// background.js for Wingman AI

// This script enables the extension's popup (action) only on specific pages.
// This is more efficient than injecting scripts everywhere, as it lets the browser
// handle the page matching.
chrome.runtime.onInstalled.addListener(() => {
  // Remove any existing rules to ensure a clean slate
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    // Add new rules to enable the action on Tinder and Bumble
    chrome.declarativeContent.onPageChanged.addRules([
      {
        // Define the conditions under which the rules are met.
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'tinder.com' },
          }),
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'bumble.com' },
          }),
        ],
        // If conditions are met, show the extension's action (popup icon).
        actions: [new chrome.declarativeContent.ShowAction()],
      },
    ]);
  });
});

// Listen for messages from other parts of the extension, like the popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapePage') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                sendResponse({ error: "No active tab found." });
                return;
            }

            const tab = tabs[0];
            let functionToInject;

            if (tab.url.includes('tinder.com')) {
                functionToInject = () => window.scrapeTinderPage();
            } else if (tab.url.includes('bumble.com')) {
                functionToInject = () => window.scrapeBumblePage();
            } else {
                sendResponse({ error: "Not on a supported page (Tinder or Bumble)." });
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: functionToInject,
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ error: `Script injection failed: ${chrome.runtime.lastError.message}` });
                    return;
                }

                if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                    sendResponse(injectionResults[0].result);
                } else if (injectionResults && injectionResults[0] && injectionResults[0].result === null) {
                    sendResponse(null); // Handle cases where null is a valid response
                }
                else {
                     // Check for a specific error message from the scraper itself
                    const scraperError = injectionResults?.[0]?.result?.error;
                    if (scraperError) {
                         sendResponse({ error: scraperError });
                    } else {
                         sendResponse({ error: "Scraping function did not return a valid result." });
                    }
                }
            });
        });

        return true; // Keep the message channel open for the asynchronous response.
    }
});


// A small log to confirm the background script is running
console.log("Wingman AI background script loaded and message listener is active.");
