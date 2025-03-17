// Gestion de l'état
let isEnabled = false;

// Fonction pour injecter manuellement le script de contenu
function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }).then(() => {
    // Si activé, basculer sur ON
    if (isEnabled) {
      chrome.tabs.sendMessage(tabId, { action: "toggle", enabled: isEnabled })
        .catch(error => {});
    }
  }).catch(err => {
    console.error(`Erreur d'injection du script de contenu: ${err.message}`);
  });
}

// Écouter les messages du popup ou des scripts de contenu
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "buttonClicked") {
    // Basculer l'état d'activation
    isEnabled = !isEnabled;
    
    // Diffuser le nouvel état à tous les onglets
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        // Ignorer les pages restreintes
        if (tab.url && 
            !tab.url.startsWith("chrome://") && 
            !tab.url.startsWith("edge://") && 
            !tab.url.startsWith("chrome-extension://") && 
            !tab.url.startsWith("extension://")) {
          
          // Essayer d'envoyer le message, si échec, injecter le script de contenu
          chrome.tabs.sendMessage(tab.id, { action: "toggle", enabled: isEnabled })
            .catch(error => {
              injectContentScript(tab.id);
            });
        }
      });
    });
    
    // Stocker l'état dans le stockage
    chrome.storage.local.set({isEnabled: isEnabled});
    
    sendResponse({ success: true, isEnabled: isEnabled });
    return true; // Garder le canal de message ouvert pour la réponse asynchrone
  }
  
  if (message.action === "getState") {
    sendResponse({ isEnabled: isEnabled });
    return true; // Garder le canal de message ouvert pour la réponse asynchrone
  }
  
  return true;
});

// Initialiser l'état de l'extension depuis le stockage quand le service worker démarre
chrome.storage.local.get(['isEnabled'], function(result) {
  isEnabled = result.isEnabled || false;
});

// Initialiser quand l'extension est installée
chrome.runtime.onInstalled.addListener(function() {
  // Rien de spécifique nécessaire ici après la suppression du debug
});

// Gérer les mises à jour des onglets pour s'assurer que les nouvelles pages obtiennent l'état actuel
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && isEnabled) {
    // Ignorer les pages restreintes
    if (tab.url &&
        !tab.url.startsWith("chrome://") && 
        !tab.url.startsWith("edge://") && 
        !tab.url.startsWith("chrome-extension://") &&
        !tab.url.startsWith("extension://")) {
      
      // Essayer d'envoyer le message, si échec, injecter le script de contenu
      chrome.tabs.sendMessage(tabId, { action: "toggle", enabled: isEnabled })
        .catch(error => {
          injectContentScript(tabId);
        });
    }
  }
});