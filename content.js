const currentModal = window.currentModal || null;
window.currentModal = window.currentModal;
let selectedText = '';

function init() {
  removeModal();
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'showLoading':
        showLoadingModal(request.level);
        break;
      case 'showExplanation':
        showExplanationModal(request.explanation, request.originalText, request.level);
        break;
      case 'showError':
        showErrorModal(request.error);
        break;
    }
  });
}

// Create and show enhanced loading modal
function showLoadingModal(level) {
  removeModal();
  
  const modal = createModal();
  modal.innerHTML = `
    <div class="explainer-modal-content explainer-loading">
      <div class="explainer-header">
        <h3>
          ${getLevelEmoji(level)} AI is thinking...
          <span class="explainer-level-badge">${getLevelName(level)}</span>
        </h3>
        <button class="explainer-close" onclick="this.closest('.explainer-modal').remove()">&times;</button>
      </div>
      <div class="explainer-body">
        <div class="explainer-spinner"></div>
        <p>Crafting your ${getLevelName(level).toLowerCase()} explanation<span class="explainer-loading-dots"></span></p>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  window.currentModal = modal;
  
  // Animate in
  setTimeout(() => modal.classList.add('explainer-show'), 10);
}

// Create and show enhanced explanation modal
function showExplanationModal(explanation, originalText, level) {
  removeModal();
  
  const modal = createModal();
  modal.innerHTML = `
    <div class="explainer-modal-content">
      <div class="explainer-header">
        <h3>
          ${getLevelEmoji(level)} Explanation Ready!
          <span class="explainer-level-badge">${getLevelName(level)}</span>
        </h3>
        <button class="explainer-close" onclick="this.closest('.explainer-modal').remove()">&times;</button>
      </div>
      <div class="explainer-body">
        <div class="explainer-original">
          <h4>📝 Original Text</h4>
          <p>"${truncateText(originalText, 250)}"</p>
        </div>
        <div class="explainer-explanation">
          <h4>✨ ${getLevelName(level)} Explanation</h4>
          <div class="explainer-content">${formatExplanation(explanation)}</div>
        </div>
      </div>
      <div class="explainer-footer">
        <button class="explainer-btn explainer-btn-secondary" onclick="copyToClipboard(\`${escapeForTemplate(explanation)}\`, this)">
          📋 Copy Explanation
        </button>
        <button class="explainer-btn explainer-btn-primary" onclick="this.closest('.explainer-modal').remove()">
          🎉 Perfect, thanks!
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  window.currentModal = modal;
  
  // Animate in
  setTimeout(() => modal.classList.add('explainer-show'), 10);
}

// Create and show enhanced error modal
function showErrorModal(error) {
  removeModal();
  
  const modal = createModal();
  modal.innerHTML = `
    <div class="explainer-modal-content explainer-error">
      <div class="explainer-header">
        <h3>🚨 Oops! Something went wrong</h3>
        <button class="explainer-close" onclick="this.closest('.explainer-modal').remove()">&times;</button>
      </div>
      <div class="explainer-body">
        <p class="explainer-error-message">${error}</p>
        <p class="explainer-error-help">
          Don't worry! This usually happens when the AI service is busy. Please try again in a moment, or try selecting a smaller piece of text.
        </p>
      </div>
      <div class="explainer-footer">
        <button class="explainer-btn explainer-btn-primary" onclick="this.closest('.explainer-modal').remove()">
          🔄 I'll try again
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  window.currentModal = modal;
  
  // Animate in
  setTimeout(() => modal.classList.add('explainer-show'), 10);
}

// Create base modal element with enhanced styling
function createModal() {
  const modal = document.createElement('div');
  modal.className = 'explainer-modal';
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('explainer-show');
      setTimeout(() => modal.remove(), 300);
    }
  };
  
  // Add escape key listener
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.classList.remove('explainer-show');
      setTimeout(() => modal.remove(), 300);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  return modal;
}

// Remove current modal with animation
function removeModal() {
  if (window.currentModal) {
    window.currentModal.classList.remove('explainer-show');
    setTimeout(() => {
      if (window.currentModal && window.currentModal.parentNode) {
        window.currentModal.remove();
      }
      window.currentModal = null;
    }, 300);
  }
}

// Get emoji for each level
function getLevelEmoji(level) {
  const emojis = {
    grade5: '🎈',
    highschool: '🎓',
    college: '🏛️',
    expert: '🔬'
  };
  return emojis[level] || '✨';
}

// Get human-readable level name
function getLevelName(level) {
  const names = {
    grade5: 'Kid-Friendly',
    highschool: 'High School',
    college: 'College Level',
    expert: 'Expert Analysis'
  };
  return names[level] || 'Standard';
}

// Enhanced text formatting
function formatExplanation(text) {
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}

// Truncate text with smart word boundaries
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Escape text for template literals
function escapeForTemplate(text) {
  return text.replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// Enhanced copy to clipboard with beautiful feedback
function copyToClipboard(text, buttonElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = buttonElement.textContent;
    const originalClass = buttonElement.className;
    
    buttonElement.textContent = '✅ Copied!';
    buttonElement.className = originalClass + ' success';
    buttonElement.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    buttonElement.style.color = 'white';
    buttonElement.style.transform = 'translateY(-2px)';
    
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.className = originalClass;
      buttonElement.style.background = '';
      buttonElement.style.color = '';
      buttonElement.style.transform = '';
    }, 2500);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      buttonElement.textContent = '✅ Copied!';
      setTimeout(() => {
        buttonElement.textContent = '📋 Copy Explanation';
      }, 2000);
    } catch (err) {
      buttonElement.textContent = '❌ Copy failed';
      setTimeout(() => {
        buttonElement.textContent = '📋 Copy Explanation';
      }, 2000);
    }
    
    document.body.removeChild(textArea);
  });
}

// Make functions globally available
window.copyToClipboard = copyToClipboard;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
