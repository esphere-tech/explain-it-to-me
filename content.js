// const marked = window.marked;
function getMarked() {
  return window.marked;
}

// Enhanced content script with Shadow DOM isolation
let currentModal = null;
let isInitialized = false;
let shadowRoot = null;
let shadowHost = null;
let modalLocked = false;
let isClosing = false;

// Initialize the content script only once
function init() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('Explain It to Me content script initialized');

  // Create Shadow DOM container for isolation
  createShadowContainer();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);

  // Add escape key listener
  document.addEventListener('keydown', handleKeyDown, true);
}

// Create Shadow DOM container - this naturally isolates our modal
function createShadowContainer() {
  // Remove any existing container
  const existing = document.getElementById('explainer-shadow-host');
  if (existing) existing.remove();

  // Create shadow host element
  shadowHost = document.createElement('div');
  shadowHost.id = 'explainer-shadow-host';
  shadowHost.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  `;

  // Attach shadow DOM (closed mode for extra protection)
  shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

  // Inject styles into shadow DOM
  const styleSheet = document.createElement('style');
  styleSheet.textContent = getModalStyles();
  shadowRoot.appendChild(styleSheet);

  // Append to document
  (document.body || document.documentElement).appendChild(shadowHost);
}

// Handle keydown events
function handleKeyDown(e) {
  if (e.key === 'Escape' && currentModal && !modalLocked) {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  }
}

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  try {
    console.log('📨 Received:', request.action);

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
    console.error('❌ Error:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true;
}

// Show loading modal
function showLoadingModal(level) {
  removeModal();
  modalLocked = true;
  shadowHost.style.pointerEvents = 'auto';

  const modal = document.createElement('div');
  modal.className = 'explainer-modal';
  modal.innerHTML = `
    <div class="explainer-modal-content explainer-loading">
      <div class="explainer-header">
        <h3>${getLevelEmoji(level)} AI is thinking...
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

  addModalEventListeners(modal);
  shadowRoot.appendChild(modal);
  currentModal = modal;

  requestAnimationFrame(() => {
    modal.classList.add('explainer-show');
    setTimeout(() => { modalLocked = false; }, 500);
  });
}

// Show explanation modal
function showExplanationModal(explanation, originalText, level) {
  modalLocked = false;

  if (currentModal) {
    // Update existing modal
    const content = currentModal.querySelector('.explainer-modal-content');
    if (content) {
      content.style.opacity = '0.7';
      setTimeout(() => {
        updateModalContent(content, explanation, originalText, level);
        content.classList.remove('explainer-loading');
        content.style.opacity = '1';
      }, 150);
    }
  } else {
    createNewExplanationModal(explanation, originalText, level);
  }
}

function updateModalContent(content, explanation, originalText, level) {
  const markedLib = getMarked();
  const html = (markedLib && typeof markedLib.parse === 'function')
    ? markedLib.parse(explanation)
    : explanation;

  content.innerHTML = `
    <div class="explainer-header">
      <h3>${getLevelEmoji(level)} Explanation Ready!
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
      <button class="explainer-btn explainer-btn-secondary explainer-copy-btn" type="button" data-text="${escapeForTemplate(explanation)}">
        📋 Copy Explanation
      </button>
      <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
        🎉 Perfect, thanks!
      </button>
    </div>
  `;
  addModalEventListeners(currentModal);
}

function createNewExplanationModal(explanation, originalText, level) {
  shadowHost.style.pointerEvents = 'auto';
  const modal = document.createElement('div');
  modal.className = 'explainer-modal';

  const markedLib = getMarked();
  const html = (markedLib && typeof markedLib.parse === 'function')
    ? markedLib.parse(explanation)
    : explanation;

  modal.innerHTML = `
    <div class="explainer-modal-content">
      <div class="explainer-header">
        <h3>${getLevelEmoji(level)} Explanation Ready!
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
        <button class="explainer-btn explainer-btn-secondary explainer-copy-btn" type="button" data-text="${escapeForTemplate(explanation)}">
          📋 Copy Explanation
        </button>
        <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
          🎉 Perfect, thanks!
        </button>
      </div>
    </div>
  `;

  addModalEventListeners(modal);
  shadowRoot.appendChild(modal);
  currentModal = modal;

  requestAnimationFrame(() => modal.classList.add('explainer-show'));
}

// Show error modal
function showErrorModal(error) {
  removeModal();
  modalLocked = false;
  shadowHost.style.pointerEvents = 'auto';

  const modal = document.createElement('div');
  modal.className = 'explainer-modal';
  modal.innerHTML = `
    <div class="explainer-modal-content explainer-error">
      <div class="explainer-header">
        <h3>🚨 Oops! Something went wrong</h3>
        <button class="explainer-close" type="button">&times;</button>
      </div>
      <div class="explainer-body">
        <p class="explainer-error-message">${error}</p>
        <p class="explainer-error-help">Please try again in a moment, or try selecting a smaller piece of text.</p>
      </div>
      <div class="explainer-footer">
        <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
          🔄 I'll try again
        </button>
      </div>
    </div>
  `;

  addModalEventListeners(modal);
  shadowRoot.appendChild(modal);
  currentModal = modal;

  requestAnimationFrame(() => modal.classList.add('explainer-show'));
}

// Add event listeners
function addModalEventListeners(modal) {
  modal.querySelectorAll('.explainer-close, .explainer-close-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      modalLocked = false;
      closeModal();
    };
  });

  const copyBtn = modal.querySelector('.explainer-copy-btn');
  if (copyBtn) {
    copyBtn.onclick = (e) => {
      e.preventDefault();
      copyToClipboard(copyBtn.dataset.text, copyBtn);
    };
  }

  modal.onclick = (e) => {
    if (modalLocked) return;
    const content = modal.querySelector('.explainer-modal-content');
    if (content && !content.contains(e.target)) {
      closeModal();
    }
  };
}

// Close modal
function closeModal() {
  if (currentModal && !isClosing) {
    isClosing = true;
    currentModal.classList.remove('explainer-show');

    setTimeout(() => {
      if (currentModal && shadowRoot.contains(currentModal)) {
        shadowRoot.removeChild(currentModal);
      }
      currentModal = null;
      isClosing = false;
      shadowHost.style.pointerEvents = 'none';
    }, 300);
  }
}

// Remove modal immediately
function removeModal() {
  if (currentModal && shadowRoot.contains(currentModal)) {
    shadowRoot.removeChild(currentModal);
  }
  currentModal = null;
  isClosing = false;
}

// Utility functions
function getLevelEmoji(level) {
  const emojis = { grade5: '🎈', highschool: '🎓', college: '🏛️', expert: '🔬' };
  return emojis[level] || '✨';
}

function getLevelName(level) {
  const names = { grade5: 'Kid-Friendly', highschool: 'High School', college: 'College', expert: 'Expert' };
  return names[level] || 'Standard';
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function escapeForTemplate(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = '✅ Copied!';
    setTimeout(() => { button.textContent = originalText; }, 2000);
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

// Get modal styles (include your CSS here)
function getModalStyles() {
  return `
    .explainer-modal {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .explainer-modal.explainer-show { opacity: 1; }
    .explainer-modal-content {
      background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 20px; max-width: 700px; width: 92%; max-height: 85vh;
      overflow: hidden; transform: scale(0.9) translateY(20px);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .explainer-modal.explainer-show .explainer-modal-content { transform: scale(1) translateY(0); }
    .explainer-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 24px 28px; display: flex;
      align-items: center; justify-content: space-between;
    }
    .explainer-header h3 { margin: 0; font-size: 22px; font-weight: 700; display: flex; align-items: center; gap: 12px; }
    .explainer-level-badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .explainer-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; font-size: 24px; cursor: pointer; }
    .explainer-close:hover { background: rgba(255,255,255,0.3); }
    .explainer-body { padding: 28px; overflow-y: auto; max-height: 60vh; }
    .explainer-original { background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .explainer-original h4, .explainer-explanation h4 { margin: 0 0 8px 0; font-size: 14px; color: #64748b; }
    .explainer-original p { margin: 0; font-style: italic; color: #475569; }
    .explainer-content { line-height: 1.7; color: #334155; }
    .explainer-footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 12px; justify-content: flex-end; }
    .explainer-btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .explainer-btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .explainer-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .explainer-btn-secondary { background: white; color: #667eea; border: 2px solid #667eea; }
    .explainer-spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .explainer-loading-dots::after { content: ''; animation: dots 1.5s infinite; }
    @keyframes dots { 0%, 20% { content: ''; } 40% { content: '.'; } 60% { content: '..'; } 80%, 100% { content: '...'; } }
    .explainer-error-message { color: #dc2626; font-weight: 500; }
    .explainer-error-help { color: #64748b; font-size: 14px; }

    /* Markdown formatting inside explainer-content */
    .explainer-content h1, .explainer-content h2, .explainer-content h3, 
    .explainer-content h4, .explainer-content h5, .explainer-content h6 {
      margin: 16px 0 8px 0; font-weight: 700; color: #1e293b;
    }
    .explainer-content h1 { font-size: 1.5em; }
    .explainer-content h2 { font-size: 1.3em; }
    .explainer-content h3 { font-size: 1.1em; }
    .explainer-content strong, .explainer-content b { font-weight: 700; color: #0f172a; }
    .explainer-content em, .explainer-content i { font-style: italic; }
    .explainer-content code {
      background: #f1f5f9; padding: 2px 6px; border-radius: 4px;
      font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9em; color: #e11d48;
    }
    .explainer-content pre {
      background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px;
      overflow-x: auto; margin: 16px 0;
    }
    .explainer-content pre code {
      background: none; padding: 0; color: inherit; font-size: 0.85em;
    }
    .explainer-content ul, .explainer-content ol {
      margin: 12px 0; padding-left: 24px;
    }
    .explainer-content li { margin: 6px 0; }
    .explainer-content blockquote {
      border-left: 4px solid #667eea; margin: 16px 0; padding: 12px 16px;
      background: #f8fafc; font-style: italic; color: #475569;
    }
    .explainer-content a { color: #667eea; text-decoration: underline; }
    .explainer-content hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
    .explainer-content table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    .explainer-content th, .explainer-content td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    .explainer-content th { background: #f1f5f9; font-weight: 600; }

  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
