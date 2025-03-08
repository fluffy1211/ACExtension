document.addEventListener('DOMContentLoaded', function() {
    // Get button element
    const actionButton = document.getElementById('actionButton');
    
    // Add click event listener
    actionButton.addEventListener('click', function() {
      // Send a message to the background script
      chrome.runtime.sendMessage({action: "buttonClicked"});
      
      // Change button text
      actionButton.textContent = "Button Clicked!";
      
      // Execute a simple script in the active tab
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: showAlert
        });
      });
    });
  });
  
  // Function to be executed in the context of the active tab
  function showAlert() {
    alert("Hello from my extension!");
  }