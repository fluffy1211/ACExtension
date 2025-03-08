// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "buttonClicked") {
    console.log("Button was clicked in the popup!");
    // You can perform background tasks here
  }
});

// Optional: Add an event for when the extension is installed
chrome.runtime.onInstalled.addListener(function () {
  console.log("Extension installed!");
});
