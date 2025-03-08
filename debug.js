document.addEventListener('DOMContentLoaded', function() {
  // Check initial status
  checkStatus();
  
  // Set up event listeners
  document.getElementById('test-toggle').addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "buttonClicked"}, function(response) {
      logResult("Toggle request", response ? "Success" : "Failed");
      checkStatus();
    });
  });
  
  document.getElementById('check-status').addEventListener('click', checkStatus);
  
  document.getElementById('test-audio').addEventListener('click', function() {
    // Create and test audio context
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5); // Stop after 0.5 seconds
      logResult("Audio test", "Success - you should hear a beep");
    } catch (error) {
      logResult("Audio test", "Failed: " + error.message);
    }
  });
  
  // Listen for keyboard events on this page
  document.addEventListener('keydown', function(event) {
    logResult("Keydown detected", "Key: " + event.key);
  });
});

function checkStatus() {
  chrome.runtime.sendMessage({action: "getState"}, function(response) {
    const statusDisplay = document.getElementById('status-display');
    
    if (response) {
      statusDisplay.textContent = response.isEnabled ? "ON" : "OFF";
      statusDisplay.className = response.isEnabled ? "success" : "error";
      logResult("Status check", "Extension is " + (response.isEnabled ? "enabled" : "disabled"));
    } else {
      statusDisplay.textContent = "Error communicating with extension";
      statusDisplay.className = "error";
      logResult("Status check", "Failed to get extension status");
    }
    
    // Check background communication
    chrome.runtime.sendMessage({action: "debugRequest"}, function(response) {
      logResult("Background script", response ? "Active" : "Not responding");
      if (response) {
        logResult("Extension version", response.version || "unknown");
      }
    });
  });
}

function logResult(test, result) {
  const resultDisplay = document.getElementById('test-results');
  const timestamp = new Date().toLocaleTimeString();
  resultDisplay.textContent += `[${timestamp}] ${test}: ${result}\n`;
}
