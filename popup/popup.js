document.addEventListener('DOMContentLoaded', function() {
    // Get button element
    const actionButton = document.getElementById('actionButton');
    
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
    
    // Add click event listener
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
  });