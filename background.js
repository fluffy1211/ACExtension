// State management
let isEnabled = false;

// Function to inject content script manually
function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }).then(() => {
    // If enabled, toggle on
    if (isEnabled) {
      chrome.tabs.sendMessage(tabId, { action: "toggle", enabled: isEnabled })
        .catch(error => {});
    }
  }).catch(err => {
    console.error(`Error injecting content script: ${err.message}`);
  });
}

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "buttonClicked") {
    // Toggle the enabled state
    isEnabled = !isEnabled;
    
    // Broadcast the new state to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        // Skip restricted pages
        if (tab.url && 
            !tab.url.startsWith("chrome://") && 
            !tab.url.startsWith("edge://") && 
            !tab.url.startsWith("chrome-extension://") && 
            !tab.url.startsWith("extension://")) {
          
          // Try sending message, if it fails, inject the content script
          chrome.tabs.sendMessage(tab.id, { action: "toggle", enabled: isEnabled })
            .catch(error => {
              injectContentScript(tab.id);
            });
        }
      });
    });
    
    // Store state in storage
    chrome.storage.local.set({isEnabled: isEnabled});
    
    sendResponse({ success: true, isEnabled: isEnabled });
    return true; // Keep the message channel open for async response
  }
  
  if (message.action === "getState") {
    sendResponse({ isEnabled: isEnabled });
    return true; // Keep the message channel open for async response
  }
  
  return true;
});

// Initialize extension state from storage when the service worker starts
chrome.storage.local.get(['isEnabled'], function(result) {
  isEnabled = result.isEnabled || false;
});

// Initialize when the extension is installed
chrome.runtime.onInstalled.addListener(function() {
  // Nothing specific needed here after debug removal
});

// Handle tab updates to ensure new pages get the current state
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && isEnabled) {
    // Skip restricted pages
    if (tab.url &&
        !tab.url.startsWith("chrome://") && 
        !tab.url.startsWith("edge://") && 
        !tab.url.startsWith("chrome-extension://") &&
        !tab.url.startsWith("extension://")) {
      
      // Try sending message, if it fails, inject the content script
      chrome.tabs.sendMessage(tabId, { action: "toggle", enabled: isEnabled })
        .catch(error => {
          injectContentScript(tabId);
        });
    }
  }
});