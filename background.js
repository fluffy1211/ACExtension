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

// Fonction pour diffuser l'état actuel à tous les onglets
function broadcastState() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      // Ignorer les pages restreintes
      if (tab.url && 
          !tab.url.startsWith("chrome://") && 
          !tab.url.startsWith("edge://") && 
          !tab.url.startsWith("chrome-extension://") && 
          !tab.url.startsWith("extension://")) {
        
        // Essayer d'envoyer le message, ignorer les erreurs silencieusement
        chrome.tabs.sendMessage(tab.id, { action: "toggle", enabled: isEnabled }).catch(() => {});
      }
    });
  });
}

// Écouter les messages du popup ou des scripts de contenu
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "openPrivacyPage") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("privacy_practices.md")
    });
    return true;
  }
  
  if (message.action === "buttonClicked") {
    // Basculer l'état d'activation
    isEnabled = !isEnabled;
    
    // Stocker l'état dans le stockage
    chrome.storage.local.set({isEnabled: isEnabled}, function() {
      // Diffuser le nouvel état à tous les onglets uniquement après la sauvegarde
      broadcastState();
    });
    
    sendResponse({ success: true, isEnabled: isEnabled });
    return true; // Garder le canal de message ouvert pour la réponse asynchrone
  }
  
  if (message.action === "getState") {
    // S'assurer que nous avons l'état le plus récent du stockage
    chrome.storage.local.get(['isEnabled'], function(result) {
      isEnabled = result.isEnabled !== undefined ? result.isEnabled : isEnabled;
      sendResponse({ isEnabled: isEnabled });
    });
    return true; // Garder le canal de message ouvert pour la réponse asynchrone
  }
  
  return true;
});

// Initialiser l'état de l'extension depuis le stockage quand le service worker démarre
chrome.storage.local.get(['isEnabled'], function(result) {
  isEnabled = result.isEnabled !== undefined ? result.isEnabled : false;
});

// Initialiser quand l'extension est installée
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['isEnabled'], function(result) {
    // Assurer que la valeur existe dans le stockage
    if (result.isEnabled === undefined) {
      chrome.storage.local.set({isEnabled: false});
    }
  });
});

// Gérer les mises à jour des onglets pour s'assurer que les nouvelles pages obtiennent l'état actuel
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    // Ignorer les pages restreintes
    if (tab.url &&
        !tab.url.startsWith("chrome://") && 
        !tab.url.startsWith("edge://") && 
        !tab.url.startsWith("chrome-extension://") &&
        !tab.url.startsWith("extension://")) {
      
      // Synchroniser toujours avec l'état actuel, qu'il soit activé ou désactivé
      chrome.tabs.sendMessage(tabId, { action: "toggle", enabled: isEnabled })
        .catch(error => {
          injectContentScript(tabId);
        });
    }
  }
});

// Écouter les événements du navigateur pour la reprise d'activité
chrome.runtime.onStartup.addListener(function() {
  // Recharger l'état depuis le stockage au démarrage
  chrome.storage.local.get(['isEnabled'], function(result) {
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : false;
    // Diffuser l'état à tous les onglets ouverts
    setTimeout(broadcastState, 2000); // Délai pour permettre aux onglets de se charger
  });
});