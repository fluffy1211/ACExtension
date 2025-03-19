// Ajouter un drapeau pour empêcher l'initialisation en double
if (typeof window.animalCrossingTypingInitialized === 'undefined') {
  window.animalCrossingTypingInitialized = true;

  // Variables globales
  let isEnabled = false;
  let audioContext = null;
  let soundBuffers = {};
  let volume = 0.5; // Volume par défaut (0-1)
  let activeSource = null; // Suivre le son en cours de lecture
  const soundFiles = [
    'typing.mp3',
  ];

  // Créer un nœud de gain pour le contrôle du volume
  let gainNode = null;
  
  // Initialiser le volume depuis le stockage
  chrome.storage.local.get(['volume'], function(result) {
    if (result.volume !== undefined) {
      volume = result.volume / 100;
    }
  });
  
  // Initialiser le contexte audio
  function initAudio() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Créer un nœud de gain pour le contrôle du volume
      gainNode = audioContext.createGain();
      gainNode.gain.value = volume;
      gainNode.connect(audioContext.destination);
      
      // Les navigateurs modernes nécessitent une interaction utilisateur pour démarrer l'audio
      if (audioContext.state === 'suspended') {
        // Essayer de reprendre sur n'importe quelle interaction utilisateur avec la page
        const resumeAudioContext = () => {
          audioContext.resume().then(() => {
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
      console.error("Erreur d'initialisation du contexte audio:", e);
    }
  }

  // Charger tous les fichiers sons
  function loadSounds() {
    soundFiles.forEach(filename => {
      const url = chrome.runtime.getURL(`sounds/${filename}`);
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          return audioContext.decodeAudioData(arrayBuffer);
        })
        .then(audioBuffer => {
          soundBuffers[filename] = audioBuffer;
        })
        .catch(error => console.error(`Error loading sound ${filename}:`, error));
    });
  }

  // Jouer un son aléatoire avec arrêt immédiat du son précédent
  function playRandomSound() {
    if (!isEnabled) {
      return;
    }
    
    if (!audioContext) {
      initAudio();
      return;
    }
    
    // Utiliser directement le seul fichier son disponible
    const soundFile = soundFiles[0];
    const buffer = soundBuffers[soundFile];
    
    if (buffer) {
      try {
        // Arrêter tout son en cours de lecture
        if (activeSource) {
          try {
            activeSource.stop();
            activeSource.disconnect();
          } catch (e) {
            // Ignorer les erreurs lors de l'arrêt des sons précédents
          }
          activeSource = null;
        }
        
        // Créer une nouvelle source de tampon
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Connecter via le nœud de gain pour le contrôle du volume
        source.connect(gainNode);
        
        // Suivre cette source
        activeSource = source;
        
        // Définir la durée du son (en secondes)
        const MAX_SOUND_DURATION = 0.4; 
        
        // Obtenir des informations sur le tampon
        const bufferDuration = buffer.duration;
        
        // S'assurer que nous avons une durée de tampon valide
        if (bufferDuration <= 0) {
          return;
        }
        
        // Calculer une meilleure position de départ aléatoire - éviter les parties silencieuses
        const goodPortionDuration = Math.min(bufferDuration, 0.5); // Utiliser au maximum la première demi-seconde
        const randomStartPosition = Math.random() * goodPortionDuration;
        
        // S'assurer que la durée ne dépasse pas la fin du tampon
        const playDuration = Math.min(MAX_SOUND_DURATION, bufferDuration - randomStartPosition);
        
        // Jouer le son
        source.start(0, randomStartPosition, playDuration);
        
        // Gérer la fin - nettoyer les références
        source.onended = () => {
          if (activeSource === source) {
            activeSource = null;
          }
        };
        
        // Nettoyage de sécurité - au cas où onended ne se déclenche pas
        setTimeout(() => {
          if (activeSource === source) {
            activeSource = null;
          }
        }, playDuration * 1000 + 100); // Ajouter une marge de 100ms
        
      } catch (e) {
        console.error("Erreur de lecture du son:", e);
        activeSource = null;
      }
    } else {
      console.warn(`Tampon de son non trouvé pour ${soundFile}`);
    }
  }

  // Écouter les événements keydown - sans limitation, juste lecture immédiate
  function handleKeyDown(event) {
    // Jouer les sons uniquement pour la frappe réelle, pas pour les touches de modification ou de fonction
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

  // Activer l'écouteur de clavier avec une approche plus agressive
  function enableKeyboardListener() {
    // Supprimer d'abord tous les écouteurs existants pour éviter les doublons
    document.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    
    // Ajouter des écouteurs à la fois au document et à la fenêtre pour une meilleure couverture
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    
    // Ajouter également au corps si il existe
    if (document.body) {
      document.body.removeEventListener('keydown', handleKeyDown, true);
      document.body.addEventListener('keydown', handleKeyDown, true);
    }
  }

  // Désactiver l'écouteur de clavier
  function disableKeyboardListener() {
    document.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    
    if (document.body) {
      document.body.removeEventListener('keydown', handleKeyDown, true);
    }
  }

  // Synchroniser l'état actuel avec le background script
  function syncStateWithBackground() {
    chrome.runtime.sendMessage({ action: "getState" }, (response) => {
      if (response) {
        if (isEnabled !== response.isEnabled) {
          isEnabled = response.isEnabled;
          
          if (isEnabled) {
            if (!audioContext) initAudio();
            enableKeyboardListener();
          } else {
            disableKeyboardListener();
          }
        }
      }
    });
  }

  // Écouter les messages du script d'arrière-plan
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggle") {
      isEnabled = message.enabled;
      
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
      
      // Mettre à jour le nœud de gain s'il existe
      if (gainNode) {
        gainNode.gain.value = volume;
      }
      
      sendResponse({ success: true });
      return true;
    }
    return true;
  });

  // Initialiser lorsque le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }

  function initializeExtension() {
    // Vérifier si l'extension doit être activée
    syncStateWithBackground();
    
    // Ajouter des écouteurs pour les changements de visibilité de la page
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Resynchroniser l'état lors de la reprise de la visibilité
        syncStateWithBackground();
      }
    });
    
    // Ajouter un écouteur pour les événements de reprise du système
    window.addEventListener('focus', syncStateWithBackground);
    
    // Vérifier périodiquement l'état (filet de sécurité)
    setInterval(syncStateWithBackground, 60000); // Vérifier toutes les minutes
  }

  // Rendre les fonctions disponibles globalement pour le débogage
  window.animalCrossingTyping = {
    enable: function() {
      isEnabled = true;
      initAudio();
      enableKeyboardListener();
      return "Animal Crossing Typing activé!";
    },
    disable: function() {
      isEnabled = false;
      disableKeyboardListener();
      return "Animal Crossing Typing désactivé!";
    },
    status: function() {
      return `Statut: ${isEnabled ? 'ON' : 'OFF'}, Contexte audio: ${audioContext ? audioContext.state : 'non initialisé'}`;
    },
    test: function() {
      if (!audioContext) initAudio();
      playRandomSound();
      return "Test de la lecture du son";
    },
    sync: function() {
      syncStateWithBackground();
      return "État synchronisé avec le background";
    }
  };
}