// Global variables
let isEnabled = false;
let audioContext = null;
let soundBuffers = {};
const soundFiles = [
  './sounds/typing.mp3',
]; // Update with your actual sound filenames

// Initialize the audio context
function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  loadSounds();
}

// Load all sound files
function loadSounds() {
  soundFiles.forEach(filename => {
    const url = chrome.runtime.getURL(`sounds/${filename}`);
    fetch(url)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        soundBuffers[filename] = audioBuffer;
      })
      .catch(error => console.error('Error loading sound:', error));
  });
}

// Play a random sound
function playRandomSound() {
  if (!isEnabled || !audioContext) return;
  
  // Get a random sound file
  const randomIndex = Math.floor(Math.random() * soundFiles.length);
  const soundFile = soundFiles[randomIndex];
  const buffer = soundBuffers[soundFile];
  
  if (buffer) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  }
}

// Listen for keydown events
function handleKeyDown(event) {
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

// Listen for messages from the popup/background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle") {
    isEnabled = message.enabled;
    
    if (isEnabled && !audioContext) {
      initAudio();
    }
    
    if (isEnabled) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    
    sendResponse({ success: true });
  }
});

// Initialize based on stored state
chrome.runtime.sendMessage({ action: "getState" }, (response) => {
  if (response && response.isEnabled) {
    isEnabled = true;
    initAudio();
    document.addEventListener('keydown', handleKeyDown);
  }
});