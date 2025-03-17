document.addEventListener('DOMContentLoaded', function() {
  // Récupérer l'élément bouton
  const actionButton = document.getElementById('actionButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  
  // Charger le réglage de volume actuel
  chrome.storage.local.get(['volume'], function(result) {
    const volume = result.volume !== undefined ? result.volume : 50;
    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
  });
  
  // Vérifier l'état actuel à l'ouverture du popup
  chrome.runtime.sendMessage({action: "getState"}, function(response) {
    if (response && response.isEnabled) {
      actionButton.textContent = "ON";
      actionButton.style.backgroundColor = "green";
    } else {
      actionButton.textContent = "OFF";
      actionButton.style.backgroundColor = "red";
    }
  });
  
  // Ajouter un écouteur d'événements pour le bouton d'alimentation
  actionButton.addEventListener('click', function() {
    // Envoyer un message au script d'arrière-plan pour basculer l'état
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