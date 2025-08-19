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

// A small log to confirm the background script is running
console.log("Wingman AI background script loaded.");
