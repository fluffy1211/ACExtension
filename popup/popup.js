document.addEventListener('DOMContentLoaded', function() {
  // Get button element
  const actionButton = document.getElementById('actionButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  
  // Load current volume setting
  chrome.storage.local.get(['volume'], function(result) {
    const volume = result.volume !== undefined ? result.volume : 70;
    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
  });
  
  // Check current state when popup opens
  chrome.runtime.sendMessage({action: "getState"}, function(response) {
    if (response && response.isEnabled) {
      actionButton.textContent = "ON";
      actionButton.style.backgroundColor = "green";
    } else {
      actionButton.textContent = "OFF";
      actionButton.style.backgroundColor = "red";
    }
  });
  
  // Add click event listener for power button
  actionButton.addEventListener('click', function() {
    // Send a message to the background script to toggle state
    chrome.runtime.sendMessage({action: "buttonClicked"}, function(response) {
      if (response && response.success) {
        if (response.isEnabled) {
          actionButton.textContent = "ON";
          actionButton.style.backgroundColor = "green";
        } else {
          actionButton.textContent = "OFF";
          actionButton.style.backgroundColor = "red";
        }
      }
    });
  });
  
  // Add volume slider event listener
  volumeSlider.addEventListener('input', function() {
    const volume = this.value;
    volumeValue.textContent = `${volume}%`;
    
    // Save volume to storage and notify content scripts
    chrome.storage.local.set({volume: volume}, function() {
      // Broadcast volume change to all tabs
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          if (tab.url && 
              !tab.url.startsWith("chrome://") && 
              !tab.url.startsWith("edge://") && 
              !tab.url.startsWith("chrome-extension://") && 
              !tab.url.startsWith("extension://")) {
            chrome.tabs.sendMessage(tab.id, { 
              action: "volumeChange", 
              volume: volume / 100 // Convert to 0-1 range for Web Audio API
            }).catch(() => {});
          }
        });
      });
    });
  });
});