// Enhanced popup script with beautiful interactions and statistics
document.addEventListener('DOMContentLoaded', async () => {
  const defaultLevelSelect = document.getElementById('defaultLevel');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const statusDiv = document.getElementById('status');
  const explanationCountEl = document.getElementById('explanationCount');
  const favoriteLevelEl = document.getElementById('favoriteLevel');

  // Load saved settings and statistics
  await loadSettings();
  await updateStatistics();

  // Save settings with enhanced feedback
  saveSettingsBtn.addEventListener('click', async () => {
    const defaultLevel = defaultLevelSelect.value;

    try {
      saveSettingsBtn.classList.add('loading');
      saveSettingsBtn.disabled = true;

      await chrome.storage.local.set({
        defaultLevel: defaultLevel
      });

      showStatus('Preferences saved! 🎉', 'success');
      
      // Add a subtle success animation
      saveSettingsBtn.style.transform = 'scale(1.05)';
      setTimeout(() => {
        saveSettingsBtn.style.transform = '';
      }, 200);

    } catch (error) {
      showStatus('Failed to save preferences', 'error');
      console.error('Save error:', error);
    } finally {
      saveSettingsBtn.classList.remove('loading');
      saveSettingsBtn.disabled = false;
    }
  });

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['defaultLevel']);
      
      if (result.defaultLevel) {
        defaultLevelSelect.value = result.defaultLevel;
      } else {
        defaultLevelSelect.value = 'highschool'; // Default to high school level
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // Update statistics display
  async function updateStatistics() {
    try {
      const result = await chrome.storage.local.get(['explanationCount', 'levelUsage']);
      
      // Update explanation count
      const count = result.explanationCount || 0;
      explanationCountEl.textContent = count;
      
      // Update favorite level
      const levelUsage = result.levelUsage || {};
      const favoriteLevel = Object.keys(levelUsage).reduce((a, b) => 
        levelUsage[a] > levelUsage[b] ? a : b, 'highschool'
      );
      
      const levelEmojis = {
        grade5: '🎈',
        highschool: '🎓',
        college: '🏛️',
        expert: '🔬'
      };
      
      favoriteLevelEl.textContent = levelEmojis[favoriteLevel] || '🎓';
      
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }

  // Show status message with enhanced styling
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Auto-hide after 3 seconds with smooth animation
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);
  }

  // Handle Enter key in select
  defaultLevelSelect.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveSettingsBtn.click();
    }
  });

  // Add smooth hover effects to feature cards
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
    });
  });

  // Add click animation to instruction steps
  const instructionSteps = document.querySelectorAll('.instruction-step');
  instructionSteps.forEach(step => {
    step.addEventListener('click', () => {
      step.style.transform = 'translateX(8px) scale(1.02)';
      setTimeout(() => {
        step.style.transform = 'translateX(4px) scale(1)';
      }, 150);
    });
  });

  // Listen for messages from background script to update stats
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStats') {
      updateStatistics();
    }
  });
});

// Update statistics when explanation is used
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'explanationUsed') {
    try {
      const result = await chrome.storage.local.get(['explanationCount', 'levelUsage']);
      
      const newCount = (result.explanationCount || 0) + 1;
      const levelUsage = result.levelUsage || {};
      levelUsage[request.level] = (levelUsage[request.level] || 0) + 1;
      
      await chrome.storage.local.set({
        explanationCount: newCount,
        levelUsage: levelUsage
      });
      
      // Update display if popup is open
      const explanationCountEl = document.getElementById('explanationCount');
      const favoriteLevelEl = document.getElementById('favoriteLevel');
      
      if (explanationCountEl) {
        explanationCountEl.textContent = newCount;
        
        // Add a subtle animation for the count update
        explanationCountEl.style.transform = 'scale(1.2)';
        explanationCountEl.style.color = '#10b981';
        setTimeout(() => {
          explanationCountEl.style.transform = 'scale(1)';
          explanationCountEl.style.color = '';
        }, 300);
      }
      
    } catch (error) {
      console.error('Failed to update statistics:', error);
    }
  }
});