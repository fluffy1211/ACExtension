// State management
let isEnabled = false;

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "buttonClicked") {
    // Toggle the enabled state
    isEnabled = !isEnabled;
    
    // Broadcast the new state to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        // Make sure tab.url exists before trying to use it
        if (tab.url && 
            !tab.url.startsWith("chrome://") && 
            !tab.url.startsWith("edge://") && 
            !tab.url.startsWith("chrome-extension://") && 
            !tab.url.startsWith("extension://")) {
          chrome.tabs.sendMessage(tab.id, { action: "toggle", enabled: isEnabled }, function(response) {
            // This callback is required to properly handle the error
            const lastError = chrome.runtime.lastError;
            // We can safely ignore the error - it just means the content script isn't loaded
          });
        }
      });
    });
    
    sendResponse({ success: true, isEnabled: isEnabled });
    return true; // Keep the message channel open for async response
  }
  
  if (message.action === "getState") {
    sendResponse({ isEnabled: isEnabled });
    return true; // Keep the message channel open for async response
  }
});

// Initialize when the extension is installed
chrome.runtime.onInstalled.addListener(function() {
  console.log("Animal Crossing Typing extension installed!");
});

// Optional: Handle tab updates to ensure new pages get the current state
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && isEnabled) {
    // Make sure tab.url exists before trying to use it
    if (tab.url &&
        !tab.url.startsWith("chrome://") && 
        !tab.url.startsWith("edge://") && 
        !tab.url.startsWith("chrome-extension://") &&
        !tab.url.startsWith("extension://")) {
      chrome.tabs.sendMessage(tabId, { action: "toggle", enabled: isEnabled }, function(response) {
        // Required callback to properly handle potential error
        const lastError = chrome.runtime.lastError;
        // We can safely ignore this error
      });
    }
  }
});