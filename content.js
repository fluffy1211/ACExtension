// Add a flag to prevent duplicate initialization
if (typeof window.animalCrossingTypingInitialized === 'undefined') {
  window.animalCrossingTypingInitialized = true;

  // Global variables
  let isEnabled = false;
  let audioContext = null;
  let soundBuffers = {};
  let volume = 0.7; // Default volume (0-1)
  let activeSource = null; // Track the currently playing sound
  const soundFiles = [
    'typing.mp3',
  ];

  // Modified logging function to not show visual indicators
  function debugLog(message) {
    if (false) { // Disable all debug logs
      console.log(`[Animal Crossing Typing] ${message}`);
    }
  }

  // Initialization indicator - silenced
  debugLog('Content script loaded');
  
  // Disabled status indicator function
  function showStatusIndicator(text, color) {
    // Function disabled to remove visual indicators
    return;
  }

  // Create a gain node for volume control
  let gainNode = null;
  
  // Initialize volume from storage
  chrome.storage.local.get(['volume'], function(result) {
    if (result.volume !== undefined) {
      volume = result.volume / 100;
      debugLog(`Volume initialized to ${volume}`);
    }
  });
  
  // Initialize the audio context
  function initAudio() {
    debugLog("Initializing Audio Context");
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a gain node for volume control
      gainNode = audioContext.createGain();
      gainNode.gain.value = volume;
      gainNode.connect(audioContext.destination);
      
      // Modern browsers require user gesture to start audio
      if (audioContext.state === 'suspended') {
        debugLog("Audio context suspended, attempting to resume");
        
        // Try to resume on any user interaction with the page
        const resumeAudioContext = () => {
          audioContext.resume().then(() => {
            debugLog("Audio context resumed successfully");
            document.removeEventListener('click', resumeAudioContext);
            document.removeEventListener('keydown', resumeAudioContext);
            loadSounds();
          }).catch(error => {
            console.error("Failed to resume audio context:", error);
          });
        };
        
        document.addEventListener('click', resumeAudioContext);
        document.addEventListener('keydown', resumeAudioContext);
      } else {
        loadSounds();
      }
    } catch (e) {
      console.error("Error initializing audio context:", e);
    }
  }

  // Load all sound files
  function loadSounds() {
    debugLog("Loading sound files:", soundFiles);
    soundFiles.forEach(filename => {
      const url = chrome.runtime.getURL(`sounds/${filename}`);
      debugLog("Fetching sound from URL:", url);
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          debugLog(`Sound file ${filename} fetched successfully`);
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          debugLog(`Decoding audio data for ${filename}`);
          return audioContext.decodeAudioData(arrayBuffer);
        })
        .then(audioBuffer => {
          debugLog(`Sound loaded successfully: ${filename}`);
          soundBuffers[filename] = audioBuffer;
        })
        .catch(error => console.error(`Error loading sound ${filename}:`, error));
    });
  }

  // Play a random sound with immediate stop of previous sound
  function playRandomSound() {
    if (!isEnabled) {
      debugLog("Sound disabled, not playing");
      return;
    }
    
    if (!audioContext) {
      debugLog("Audio context not initialized, attempting to initialize");
      initAudio();
      return;
    }
    
    // Get a random sound file
    const randomIndex = Math.floor(Math.random() * soundFiles.length);
    const soundFile = soundFiles[randomIndex];
    const buffer = soundBuffers[soundFile];
    
    if (buffer) {
      try {
        // Stop any currently playing sound
        if (activeSource) {
          try {
            activeSource.stop();
            activeSource.disconnect();
          } catch (e) {
            // Ignore errors when stopping previous sounds
          }
          activeSource = null;
        }
        
        // Create a new buffer source
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Connect through gain node for volume control
        source.connect(gainNode);
        
        // Keep track of this source
        activeSource = source;
        
        // Define the sound duration (in seconds)
        // 0.2 seconds is a good balance - not too short, not too long
        const MAX_SOUND_DURATION = 0.4; 
        
        // Get buffer information
        const bufferDuration = buffer.duration;
        
        // Make sure we have valid buffer duration
        if (bufferDuration <= 0) {
          debugLog("Invalid buffer duration, cannot play sound");
          return;
        }
        
        // Calculate a better random start position - avoid silent parts
        // Most typing sounds have the best part at the beginning
        const goodPortionDuration = Math.min(bufferDuration, 0.5); // Use first half second maximum
        const randomStartPosition = Math.random() * goodPortionDuration;
        
        // Ensure duration doesn't go beyond buffer end
        const playDuration = Math.min(MAX_SOUND_DURATION, bufferDuration - randomStartPosition);
        
        // Play the sound
        source.start(0, randomStartPosition, playDuration);
        debugLog(`Playing sound: ${soundFile} at position ${randomStartPosition.toFixed(2)}s for ${playDuration.toFixed(2)}s`);
        
        // Handle completion - clean up references
        source.onended = () => {
          if (activeSource === source) {
            activeSource = null;
          }
        };
        
        // Safety cleanup - in case onended doesn't fire
        setTimeout(() => {
          if (activeSource === source) {
            activeSource = null;
          }
        }, playDuration * 1000 + 100); // Add 100ms buffer
        
      } catch (e) {
        console.error("Error playing sound:", e);
        activeSource = null;
      }
    } else {
      console.warn(`Sound buffer not found for ${soundFile}`);
    }
  }

  // Listen for keydown events - without throttling, just immediate play
  function handleKeyDown(event) {
    debugLog(`Key pressed: ${event.key}`);
    
    // Only play sounds for actual typing, not for modifier keys or function keys
    const ignoredKeys = [
      'Shift', 'Control', 'Alt', 'Meta', 
      'CapsLock', 'Tab', 'Escape', 
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown',
      'Insert', 'Delete', 'PrintScreen', 'ScrollLock', 'Pause',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];
    
    if (!ignoredKeys.includes(event.key)) {
      playRandomSound();
    }
  }

  // Enable keyboard listener with a more aggressive approach
  function enableKeyboardListener() {
    debugLog("Adding keydown listener to document and window");
    
    // Remove any existing listeners first to avoid duplicates
    document.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    
    // Add listeners to both document and window for better coverage
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    
    // Also add to body if it exists
    if (document.body) {
      document.body.removeEventListener('keydown', handleKeyDown, true);
      document.body.addEventListener('keydown', handleKeyDown, true);
    }
    
    debugLog("Keyboard listeners attached");
  }

  // Disable keyboard listener
  function disableKeyboardListener() {
    debugLog("Removing keydown listener from document and window");
    document.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    
    if (document.body) {
      document.body.removeEventListener('keydown', handleKeyDown, true);
    }
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog(`Message received: ${JSON.stringify(message)}`);
    
    if (message.action === "toggle") {
      isEnabled = message.enabled;
      debugLog(`Extension ${isEnabled ? 'enabled' : 'disabled'}`);
      
      if (isEnabled) {
        if (!audioContext) {
          initAudio();
        }
        enableKeyboardListener();
      } else {
        disableKeyboardListener();
      }
      
      sendResponse({ success: true });
      return true;
    } else if (message.action === "volumeChange") {
      volume = message.volume;
      debugLog(`Volume changed to ${volume}`);
      
      // Update gain node if it exists
      if (gainNode) {
        gainNode.gain.value = volume;
      }
      
      sendResponse({ success: true });
      return true;
    }
    return true;
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }

  function initializeExtension() {
    debugLog("DOM is ready, initializing extension");
    
    // Check if extension should be enabled
    chrome.runtime.sendMessage({ action: "getState" }, (response) => {
      debugLog(`Initial state received: ${JSON.stringify(response)}`);
      
      if (response && response.isEnabled) {
        isEnabled = true;
        initAudio();
        enableKeyboardListener();
      }
    });
  }

  // Make functions globally available for debugging
  window.animalCrossingTyping = {
    enable: function() {
      isEnabled = true;
      initAudio();
      enableKeyboardListener();
      return "Animal Crossing Typing enabled!";
    },
    disable: function() {
      isEnabled = false;
      disableKeyboardListener();
      return "Animal Crossing Typing disabled!";
    },
    status: function() {
      return `Status: ${isEnabled ? 'ON' : 'OFF'}, Audio Context: ${audioContext ? audioContext.state : 'not initialized'}`;
    },
    test: function() {
      if (!audioContext) initAudio();
      playRandomSound();
      return "Testing sound playback";
    }
  };

  debugLog("Initialization complete");
}