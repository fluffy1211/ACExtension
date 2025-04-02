document.addEventListener('DOMContentLoaded', function() {
  // Replace actionButton with toggleSwitch
  const toggleSwitch = document.getElementById('toggleSwitch');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const privacyLink = document.getElementById('privacyLink');
  const kofiLink = document.getElementById('kofiLink');
  
  // Handle privacy link click
  privacyLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.sendMessage({action: "openPrivacyPage"});
  });
  
  // Handle Ko-fi link click
  kofiLink.addEventListener('click', function(e) {
    // No need to prevent default as we want it to open in a new tab
    // The target="_blank" attribute in the HTML takes care of that
  });
  
  // Charger le réglage de volume actuel
  chrome.storage.local.get(['volume'], function(result) {
    const volume = result.volume !== undefined ? result.volume : 50;
    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
  });
  
  // Vérifier l'état actuel à l'ouverture du popup
  chrome.runtime.sendMessage({action: "getState"}, function(response) {
    if (response && response.isEnabled) {
      toggleSwitch.checked = true;
    } else {
      toggleSwitch.checked = false;
    }
  });
  
  // Ajouter un écouteur d'événements pour le toggle switch
  toggleSwitch.addEventListener('change', function() {
    // Envoyer un message au script d'arrière-plan pour basculer l'état
    chrome.runtime.sendMessage({action: "buttonClicked"}, function(response) {
      if (response && response.success) {
        toggleSwitch.checked = response.isEnabled;
      }
    });
  });
  
  // Ajouter un écouteur d'événements pour le curseur de volume
  volumeSlider.addEventListener('input', function() {
    const volume = this.value;
    volumeValue.textContent = `${volume}%`;
    
    // Sauvegarder le volume dans le stockage et notifier les scripts de contenu
    chrome.storage.local.set({volume: volume}, function() {
      // Diffuser le changement de volume à tous les onglets
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          if (tab.url && 
              !tab.url.startsWith("chrome://") && 
              !tab.url.startsWith("edge://") && 
              !tab.url.startsWith("chrome-extension://") && 
              !tab.url.startsWith("extension://")) {
            chrome.tabs.sendMessage(tab.id, { 
              action: "volumeChange", 
              volume: volume / 100 // Convertir à la plage 0-1 pour l'API Web Audio
            }).catch(() => {});
          }
        });
      });
    });
  });
});