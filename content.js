const marked = window.marked;

// Enhanced content script with bulletproof modal handling
let currentModal = null;
let isInitialized = false;
let modalContainer = null;
let modalLocked = false; // Prevent accidental closures during critical operations
let isClosing = false; // Prevent double-closing
let pendingClose = false; // Handle queued close operations

// Initialize the content script only once
function init() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('Explain It to Me content script initialized');

  // Create a dedicated container for our modals
  createModalContainer();

  // Clean up any existing modals
  removeModal();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);

  // Add escape key listener with protection
  document.addEventListener('keydown', handleKeyDown, true);

  // Prevent page scripts from interfering
  protectFromPageInterference();
}

// Protect modal from page interference
function protectFromPageInterference() {
  // Store original methods
  const originalRemove = Element.prototype.remove;
  const originalSetAttribute = Element.prototype.setAttribute;
  const originalRemoveChild = Node.prototype.removeChild;

  // Override remove method
  Element.prototype.remove = function () {
    // Don't allow page scripts to remove our modal unless we're intentionally closing
    if ((this.id === 'explainer-modal-container' ||
      this.classList?.contains('explainer-modal')) && !isClosing) {
      console.log('🛡️ Blocked attempt to remove modal');
      return;
    }
    return originalRemove.call(this);
  };

  // Override removeChild method
  Node.prototype.removeChild = function (child) {
    // Don't allow page scripts to remove our modal unless we're intentionally closing
    if ((child.id === 'explainer-modal-container' ||
      child.classList?.contains('explainer-modal')) && !isClosing) {
      console.log('🛡️ Blocked attempt to removeChild modal');
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  // Protect against style changes
  Element.prototype.setAttribute = function (name, value) {
    if ((this.id === 'explainer-modal-container' ||
      this.classList?.contains('explainer-modal')) &&
      (name === 'style' || name === 'class') && !isClosing) {
      console.log('🛡️ Blocked attempt to modify modal attributes');
      return;
    }
    return originalSetAttribute.call(this, name, value);
  };
}

// Enhanced keydown handler
function handleKeyDown(e) {
  if (e.key === 'Escape' && currentModal && !modalLocked) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeModal();
  }
}

// Create a dedicated container for our modals to avoid conflicts
function createModalContainer() {
  if (modalContainer && document.contains(modalContainer)) return;

  // Remove any existing container first
  const existing = document.getElementById('explainer-modal-container');
  if (existing) {
    isClosing = true;
    existing.remove();
    isClosing = false;
  }

  modalContainer = document.createElement('div');
  modalContainer.id = 'explainer-modal-container';
  modalContainer.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  `;

  // Append to body or html if body doesn't exist
  const target = document.body || document.documentElement;
  target.appendChild(modalContainer);

  // Re-append if it gets removed (but not during intentional closing)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && !isClosing) {
        mutation.removedNodes.forEach((node) => {
          if (node === modalContainer) {
            console.log('🔄 Modal container was removed, re-adding...');
            setTimeout(() => {
              if (!document.contains(modalContainer) && !isClosing) {
                target.appendChild(modalContainer);
              }
            }, 10);
          }
        });
      }
    });
  });

  observer.observe(target, { childList: true });
}

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  try {
    console.log('📨 Content script received message:', request.action);

    switch (request.action) {
      case 'ping':
        sendResponse({ success: true, ready: true });
        break;
      case 'showLoading':
        showLoadingModal(request.level);
        sendResponse({ success: true });
        break;
      case 'showExplanation':
        showExplanationModal(request.explanation, request.originalText, request.level);
        sendResponse({ success: true });
        break;
      case 'showError':
        showErrorModal(request.error);
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }

  return true; // Keep sendResponse alive
}

// Create and show enhanced loading modal
function showLoadingModal(level) {
  console.log('🔄 Showing loading modal for level:', level);

  // Clean removal of existing modal
  cleanRemoveModal();

  modalLocked = true; // Lock during loading to prevent accidental closure

  const modal = createModal();
  modal.innerHTML = `
    <div class="explainer-modal-content explainer-loading">
      <div class="explainer-header">
        <h3>
          ${getLevelEmoji(level)} AI is thinking...
          <span class="explainer-level-badge">${getLevelName(level)}</span>
        </h3>
        <button class="explainer-close" type="button">&times;</button>
      </div>
      <div class="explainer-body">
        <div class="explainer-spinner"></div>
        <p>Crafting your ${getLevelName(level).toLowerCase()} explanation<span class="explainer-loading-dots"></span></p>
      </div>
    </div>
  `;

  // Add event listeners after creating the modal
  addModalEventListeners(modal);

  modalContainer.appendChild(modal);
  currentModal = modal;

  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('explainer-show');
    // Unlock after animation completes
    setTimeout(() => {
      modalLocked = false;
    }, 500);
  });
}

// Create and show enhanced explanation modal - FIXED VERSION
function showExplanationModal(explanation, originalText, level) {
  console.log('✨ Showing explanation modal for level:', level);

  // Don't remove the current modal immediately - transition smoothly
  if (currentModal) {
    // Update the existing modal content instead of removing and recreating
    updateModalToExplanation(explanation, originalText, level);
  } else {
    // Create new modal if none exists
    createExplanationModal(explanation, originalText, level);
  }
}

// Update existing modal to show explanation content
function updateModalToExplanation(explanation, originalText, level) {
  if (!currentModal) return;

  modalLocked = false; // Allow closing for explanation modal
  const escapedExplanation = escapeForTemplate(explanation);

  // Update the modal content with smooth transition
  const modalContent = currentModal.querySelector('.explainer-modal-content');
  if (modalContent) {
    // Add transition class
    modalContent.style.transition = 'all 0.3s ease';
    modalContent.style.opacity = '0.7';

    setTimeout(() => {
      const html = (marked && typeof marked.parse === 'function')
        ? marked.parse(explanation)
        : explanation; // fallback to plain text

      modalContent.innerHTML = `
        <div class="explainer-header">
          <h3>
            ${getLevelEmoji(level)} Explanation Ready!
            <span class="explainer-level-badge">${getLevelName(level)}</span>
          </h3>
          <button class="explainer-close" type="button">&times;</button>
        </div>
        <div class="explainer-body">
          <div class="explainer-original">
            <h4>📝 Original Text</h4>
            <p>"${truncateText(originalText, 250)}"</p>
          </div>
          <div class="explainer-explanation">
            <h4>✨ ${getLevelName(level)} Explanation</h4>
            <div class="explainer-content">${html}</div>
          </div>
        </div>
        <div class="explainer-footer">
          <button class="explainer-btn explainer-btn-secondary explainer-copy-btn" type="button" data-text="${escapedExplanation}">
            📋 Copy Explanation
          </button>
          <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
            🎉 Perfect, thanks!
          </button>
        </div>
      `;

      // Remove loading class and restore opacity
      modalContent.classList.remove('explainer-loading');
      modalContent.style.opacity = '1';

      // Re-add event listeners for the new content
      addModalEventListeners(currentModal);

      console.log('✅ Modal content updated to explanation successfully');
    }, 150);
  }
}

// Create new explanation modal
function createExplanationModal(explanation, originalText, level) {
  modalLocked = false; // Allow closing for explanation modal

  const modal = createModal();
  const escapedExplanation = escapeForTemplate(explanation);

  modal.innerHTML = `
    <div class="explainer-modal-content">
      <div class="explainer-header">
        <h3>
          ${getLevelEmoji(level)} Explanation Ready!
          <span class="explainer-level-badge">${getLevelName(level)}</span>
        </h3>
        <button class="explainer-close" type="button">&times;</button>
      </div>
      <div class="explainer-body">
        <div class="explainer-original">
          <h4>📝 Original Text</h4>
          <p>"${truncateText(originalText, 250)}"</p>
        </div>
        <div class="explainer-explanation">
          <h4>✨ ${getLevelName(level)} Explanation</h4>
          <div class="explainer-content">${marked.parse(explanation)}</div>
        </div>
      </div>
      <div class="explainer-footer">
        <button class="explainer-btn explainer-btn-secondary explainer-copy-btn" type="button" data-text="${escapedExplanation}">
          📋 Copy Explanation
        </button>
        <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
          🎉 Perfect, thanks!
        </button>
      </div>
    </div>
  `;

  // Add event listeners after creating the modal
  addModalEventListeners(modal);

  modalContainer.appendChild(modal);
  currentModal = modal;

  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('explainer-show');
    console.log('✅ Explanation modal displayed successfully');
  });
}

// Create and show enhanced error modal
function showErrorModal(error) {
  console.log('❌ Showing error modal:', error);

  cleanRemoveModal();
  modalLocked = false; // Allow closing for error modal

  const modal = createModal();
  modal.innerHTML = `
    <div class="explainer-modal-content explainer-error">
      <div class="explainer-header">
        <h3>🚨 Oops! Something went wrong</h3>
        <button class="explainer-close" type="button">&times;</button>
      </div>
      <div class="explainer-body">
        <p class="explainer-error-message">${error}</p>
        <p class="explainer-error-help">
          Don't worry! This usually happens when the AI service is busy. Please try again in a moment, or try selecting a smaller piece of text.
        </p>
      </div>
      <div class="explainer-footer">
        <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
          🔄 I'll try again
        </button>
      </div>
    </div>
  `;

  // Add event listeners after creating the modal
  addModalEventListeners(modal);

  modalContainer.appendChild(modal);
  currentModal = modal;

  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('explainer-show');
  });
}

// Add event listeners to modal elements with bulletproof close functionality - FIXED VERSION
function addModalEventListeners(modal) {
  // Close button listeners - BULLETPROOF VERSION
  const closeButtons = modal.querySelectorAll('.explainer-close, .explainer-close-btn');
  closeButtons.forEach(btn => {
    // Clear any existing event listeners by cloning the button
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    // Define the close handler function
    const closeHandler = (e) => {
      console.log('🔴 Close button clicked!');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Force close even if locked (user explicitly clicked close)
      if (modalLocked) {
        console.log('🔓 Forcing close despite lock');
        modalLocked = false;
      }

      closeModal();
    };

    // Add multiple event types for maximum reliability
    newBtn.addEventListener('click', closeHandler, { capture: true, passive: false });
    newBtn.addEventListener('mousedown', closeHandler, { capture: true, passive: false });
    newBtn.addEventListener('touchstart', closeHandler, { capture: true, passive: false });

    // Ensure button is always clickable
    newBtn.style.pointerEvents = 'auto';
    newBtn.style.cursor = 'pointer';
    newBtn.style.zIndex = '999999';
    newBtn.style.position = 'relative';
  });

  // Copy button listener with protection
  const copyBtn = modal.querySelector('.explainer-copy-btn');
  if (copyBtn) {
    // Clear any existing event listeners by cloning the button
    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

    // Define the copy handler function
    const copyHandler = (e) => {
      console.log('📋 Copy button clicked!');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const textToCopy = newCopyBtn.getAttribute('data-text');
      copyToClipboard(textToCopy, newCopyBtn);
    };

    newCopyBtn.addEventListener('click', copyHandler, { capture: true, passive: false });
    newCopyBtn.addEventListener('mousedown', copyHandler, { capture: true, passive: false });
    newCopyBtn.addEventListener('touchstart', copyHandler, { capture: true, passive: false });

    // Ensure button is always clickable
    newCopyBtn.style.pointerEvents = 'auto';
    newCopyBtn.style.cursor = 'pointer';
    newCopyBtn.style.zIndex = '999999';
    newCopyBtn.style.position = 'relative';
  }

  // Background click listener with better detection
  modal.addEventListener('click', (e) => {
    if (modalLocked) return;

    const contentBox = modal.querySelector('.explainer-modal-content');
    if (!contentBox) return;

    const rect = contentBox.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // Check if click is outside the content box
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      console.log('🖱️ Background clicked, closing modal');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeModal();
    }
  }, { capture: true, passive: false });
}

// Create base modal element with enhanced styling and protection
function createModal() {
  const modal = document.createElement('div');
  modal.className = 'explainer-modal';
  modal.style.cssText = `
    pointer-events: auto !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    visibility: visible !important;
  `;

  return modal;
}

// Close modal function with proper cleanup
function closeModal() {
  console.log('🔴 closeModal called, currentModal:', !!currentModal, 'isClosing:', isClosing);

  if (currentModal && !isClosing) {
    isClosing = true; // Set flag to allow removal
    modalLocked = false; // Unlock

    console.log('🎬 Starting modal close animation');
    currentModal.classList.remove('explainer-show');

    setTimeout(() => {
      console.log('🗑️ Removing modal from DOM');
      if (currentModal && modalContainer && modalContainer.contains(currentModal)) {
        // Use direct DOM manipulation to bypass protection
        modalContainer.removeChild(currentModal);
      }
      currentModal = null;
      isClosing = false; // Reset flag
      console.log('✅ Modal closed successfully');
    }, 300);
  }
}

// Clean removal of current modal - IMPROVED VERSION
function cleanRemoveModal() {
  if (currentModal && !isClosing) {
    isClosing = true;

    console.log('🧹 Clean removing existing modal');
    currentModal.classList.remove('explainer-show');

    // Shorter timeout for quicker transitions, but still visible
    setTimeout(() => {
      if (currentModal && modalContainer && modalContainer.contains(currentModal)) {
        modalContainer.removeChild(currentModal);
      }
      currentModal = null;
      isClosing = false;
    }, 100); // Very short timeout to prevent gap
  }
}

// Remove current modal with animation and protection
function removeModal() {
  if (currentModal && !isClosing) {
    isClosing = true;

    currentModal.classList.remove('explainer-show');
    setTimeout(() => {
      if (currentModal && currentModal.parentNode) {
        currentModal.parentNode.removeChild(currentModal);
      }
      currentModal = null;
      modalLocked = false;
      isClosing = false;
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

// Escape text for template literals and HTML attributes
function escapeForTemplate(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

// Enhanced copy to clipboard with beautiful feedback
function copyToClipboard(text, buttonElement) {
  // Decode HTML entities for copying
  const decodedText = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\`/g, '`')
    .replace(/\\\$/g, '$');

  navigator.clipboard.writeText(decodedText).then(() => {
    const originalText = buttonElement.textContent;
    const originalClass = buttonElement.className;

    buttonElement.textContent = '✅ Copied!';
    buttonElement.className = originalClass + ' success';
    buttonElement.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    buttonElement.style.color = 'white';
    buttonElement.style.transform = 'translateY(-2px)';

    setTimeout(() => {
      if (buttonElement) {
        buttonElement.textContent = originalText;
        buttonElement.className = originalClass;
        buttonElement.style.background = '';
        buttonElement.style.color = '';
        buttonElement.style.transform = '';
      }
    }, 2500);
  }).catch(err => {
    console.error('Failed to copy text: ', err);

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = decodedText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      buttonElement.textContent = '✅ Copied!';
      setTimeout(() => {
        if (buttonElement) {
          buttonElement.textContent = '📋 Copy Explanation';
        }
      }, 2000);
    } catch (err) {
      buttonElement.textContent = '❌ Copy failed';
      setTimeout(() => {
        if (buttonElement) {
          buttonElement.textContent = '📋 Copy Explanation';
        }
      }, 2000);
    }

    document.body.removeChild(textArea);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Also initialize immediately in case DOMContentLoaded already fired
init();