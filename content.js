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
  
  // Throttling configuration
  const MIN_TIME_BETWEEN_SOUNDS = 60; // Minimum time between sounds in milliseconds
  let lastSoundTimestamp = 0; // Track the last time a sound was played

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

  // Jouer un son avec arrêt immédiat du son précédent
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
        stopActiveSource();
        
        // Créer une nouvelle source de tampon
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Connecter via le nœud de gain pour le contrôle du volume
        source.connect(gainNode);
        
        // Suivre cette source
        activeSource = source;
        
        // Obtenir des informations sur le tampon
        const bufferDuration = buffer.duration;
        
        // S'assurer que nous avons une durée de tampon valide
        if (bufferDuration <= 0) {
          activeSource = null; // Nettoyer si le tampon n'est pas valide
          return;
        }

        // Définir des zones "sûres" connues dans le fichier audio
        // qui garantissent un son de qualité (ajustez selon votre fichier audio)
        const guaranteedSections = [
          { start: 0.1, duration: 0.2 },
          { start: 0.4, duration: 0.25 },
          { start: 0.7, duration: 0.2 },
          { start: 1.1, duration: 0.2 },
          { start: 1.5, duration: 0.25 }
        ];
        
        // Ajouter plus de sections si le fichier est plus long
        if (bufferDuration > 3) {
          guaranteedSections.push(
            { start: 2.0, duration: 0.2 },
            { start: 2.5, duration: 0.2 },
            { start: 3.0, duration: 0.2 }
          );
        }
        
        // Si le fichier est encore plus long, ajouter d'autres positions
        // en évitant les zones silencieuses potentielles
        if (bufferDuration > 5) {
          const usableDuration = bufferDuration - 1; // Éviter la dernière seconde
          for (let pos = 3.5; pos < usableDuration; pos += 0.5) {
            guaranteedSections.push({ start: pos, duration: 0.2 });
          }
        }

        // Sélectionner une section aléatoire parmi les sections garanties
        const randomSection = guaranteedSections[Math.floor(Math.random() * guaranteedSections.length)];
        const randomStart = randomSection.start;
        const typingSoundDuration = randomSection.duration;

        // Légère variation de hauteur pour chaque frappe (naturel)
        source.playbackRate.value = 0.97 + (Math.random() * 0.06);
        
        // Jouer le son depuis la position calculée avec une durée fixe
        // Cette approche garantit que nous aurons toujours un son complet
        source.start(0, randomStart, typingSoundDuration);
        
        // Gérer la fin - nettoyer les références
        source.onended = () => {
          if (activeSource === source) {
            activeSource = null;
          }
        };
        
        // Nettoyage de sécurité
        setTimeout(() => {
          if (activeSource === source) {
            activeSource = null;
          }
        }, typingSoundDuration * 1000 + 100);
        
      } catch (e) {
        console.error("Erreur de lecture du son:", e);
        activeSource = null;
      }
    } else {
      // Si le tampon n'est pas encore chargé, essayer de le recharger
      console.warn(`Tampon de son non trouvé, tentative de rechargement...`);
      loadSounds();
    }
  }

  // Helper function to safely stop and clean up the active audio source
  function stopActiveSource() {
    if (activeSource) {
      try {
        activeSource.stop();
      } catch (e) {
        // Ignorer les erreurs si la source a déjà été arrêtée
      }
      
      try {
        activeSource.disconnect();
      } catch (e) {
        // Ignorer les erreurs si la source a déjà été déconnectée
      }
      
      activeSource = null;
    }
  }

  // Écouteur d'événements clavier amélioré pour une meilleure fiabilité
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
      const currentTime = Date.now();
      
      // Check if enough time has passed since the last sound
      if (currentTime - lastSoundTimestamp >= MIN_TIME_BETWEEN_SOUNDS) {
        // Vérifier que le son est réellement disponible avant de tenter de le jouer
        if (Object.keys(soundBuffers).length === 0) {
          // Si les sons ne sont pas encore chargés, les charger immédiatement
          if (audioContext) {
            loadSounds();
          } else {
            initAudio();
          }
        }
        
        // Update the timestamp for the last played sound
        lastSoundTimestamp = currentTime;
        
        // Jouer le son avec un délai minimal pour garantir que le contexte audio est prêt
        setTimeout(() => playRandomSound(), 0);
      }
      // If not enough time has passed, we skip playing the sound to avoid overloading
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
    
    // Nettoyer toute source audio active lors de la désactivation
    stopActiveSource();
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
      if (document.visibilityState === 'hidden') {
        // Clean up activeSource when page becomes hidden
        stopActiveSource();
      } else if (document.visibilityState === 'visible') {
        // Resynchroniser l'état lors de la reprise de la visibilité
        syncStateWithBackground();
      }
    });
    
    // Ajouter un écouteur pour les événements de reprise du système
    window.addEventListener('focus', syncStateWithBackground);
    
    // Vérifier périodiquement l'état (filet de sécurité)
    setInterval(syncStateWithBackground, 60000); // Vérifier toutes les minutes
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', stopActiveSource);

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
    },
    stopSound: function() {
      stopActiveSource();
      return "All sounds stopped";
    },
    getThrottleDelay: function() {
      return MIN_TIME_BETWEEN_SOUNDS;
    },
    getLastSoundTime: function() {
      return lastSoundTimestamp;
    }
  };
}