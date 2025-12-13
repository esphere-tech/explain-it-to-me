const marked = window.marked;

// Enhanced content script with Shadow DOM isolation
let currentModal = null;
let isInitialized = false;
let shadowRoot = null;
let shadowHost = null;
let modalLocked = false;
let isClosing = false;
let chatPanelOpen = false;
let conversationHistory = [];
let currentContext = { originalText: '', explanation: '', level: '' };

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
  if (e.key === 'Escape') {
    if (chatPanelOpen) {
      e.preventDefault();
      e.stopPropagation();
      closeChatPanel();
    } else if (currentModal && !modalLocked) {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    }
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
      case 'followUpResponse':
        handleFollowUpResponse(request.response);
        sendResponse({ success: true });
        break;
      case 'followUpError':
        handleFollowUpError(request.error);
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
  
  // Store context for follow-up questions
  currentContext = { originalText, explanation, level };
  conversationHistory = [
    { role: 'user', content: `Explain this: "${originalText}"` },
    { role: 'assistant', content: explanation }
  ];

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
  const html = (marked && typeof marked.parse === 'function')
    ? marked.parse(explanation)
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
      <button class="explainer-btn explainer-btn-chat explainer-followup-btn" type="button">
        💬 Ask Follow-up
      </button>
      <div class="explainer-footer-right">
        <button class="explainer-btn explainer-btn-secondary explainer-copy-btn" type="button" data-text="${escapeForTemplate(explanation)}">
          📋 Copy
        </button>
        <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
          ✓ Done
        </button>
      </div>
    </div>
  `;
  addModalEventListeners(currentModal);
}

function createNewExplanationModal(explanation, originalText, level) {
  shadowHost.style.pointerEvents = 'auto';
  const modal = document.createElement('div');
  modal.className = 'explainer-modal';

  const html = (marked && typeof marked.parse === 'function')
    ? marked.parse(explanation)
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
        <button class="explainer-btn explainer-btn-chat explainer-followup-btn" type="button">
          💬 Ask Follow-up
        </button>
        <div class="explainer-footer-right">
          <button class="explainer-btn explainer-btn-secondary explainer-copy-btn" type="button" data-text="${escapeForTemplate(explanation)}">
            📋 Copy
          </button>
          <button class="explainer-btn explainer-btn-primary explainer-close-btn" type="button">
            ✓ Done
          </button>
        </div>
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

// ============= CHAT PANEL FUNCTIONS =============

function openChatPanel() {
  if (chatPanelOpen) return;
  chatPanelOpen = true;

  // Transform modal to split view
  if (currentModal) {
    currentModal.classList.add('explainer-split-view');
  }

  // Create chat panel
  const chatPanel = document.createElement('div');
  chatPanel.className = 'explainer-chat-panel';
  chatPanel.innerHTML = `
    <div class="explainer-chat-header">
      <h4>💬 Follow-up Chat</h4>
      <button class="explainer-chat-close" type="button">&times;</button>
    </div>
    <div class="explainer-chat-messages" id="chat-messages">
      <div class="explainer-chat-welcome">
        <p>Ask any follow-up questions about the explanation above.</p>
      </div>
    </div>
    <div class="explainer-chat-input-container">
      <textarea class="explainer-chat-input" placeholder="Ask a follow-up question..." rows="1"></textarea>
      <button class="explainer-chat-send" type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  `;

  shadowRoot.appendChild(chatPanel);

  // Add event listeners
  const closeBtn = chatPanel.querySelector('.explainer-chat-close');
  closeBtn.onclick = () => closeChatPanel();

  const textarea = chatPanel.querySelector('.explainer-chat-input');
  const sendBtn = chatPanel.querySelector('.explainer-chat-send');

  // Auto-resize textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  });

  // Send on Enter (Shift+Enter for new line)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFollowUpQuestion(textarea.value.trim());
      textarea.value = '';
      textarea.style.height = 'auto';
    }
  });

  sendBtn.onclick = () => {
    sendFollowUpQuestion(textarea.value.trim());
    textarea.value = '';
    textarea.style.height = 'auto';
  };

  // Animate in
  requestAnimationFrame(() => {
    chatPanel.classList.add('explainer-chat-show');
    textarea.focus();
  });
}

function closeChatPanel() {
  if (!chatPanelOpen) return;
  chatPanelOpen = false;

  const chatPanel = shadowRoot.querySelector('.explainer-chat-panel');
  if (chatPanel) {
    chatPanel.classList.remove('explainer-chat-show');
    setTimeout(() => chatPanel.remove(), 300);
  }

  if (currentModal) {
    currentModal.classList.remove('explainer-split-view');
  }
}

function sendFollowUpQuestion(question) {
  if (!question) return;

  const messagesContainer = shadowRoot.querySelector('#chat-messages');
  if (!messagesContainer) return;

  // Remove welcome message if present
  const welcome = messagesContainer.querySelector('.explainer-chat-welcome');
  if (welcome) welcome.remove();

  // Add user message
  const userMsg = document.createElement('div');
  userMsg.className = 'explainer-chat-message explainer-chat-user';
  userMsg.innerHTML = `<p>${escapeHtml(question)}</p>`;
  messagesContainer.appendChild(userMsg);

  // Add loading message
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'explainer-chat-message explainer-chat-assistant explainer-chat-loading';
  loadingMsg.id = 'chat-loading';
  loadingMsg.innerHTML = `<div class="explainer-chat-typing"><span></span><span></span><span></span></div>`;
  messagesContainer.appendChild(loadingMsg);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Add to conversation history
  conversationHistory.push({ role: 'user', content: question });

  // Send to background script
  chrome.runtime.sendMessage({
    action: 'followUpQuestion',
    question: question,
    context: currentContext,
    history: conversationHistory
  });
}

function handleFollowUpResponse(response) {
  const messagesContainer = shadowRoot.querySelector('#chat-messages');
  if (!messagesContainer) return;

  // Remove loading message
  const loadingMsg = shadowRoot.querySelector('#chat-loading');
  if (loadingMsg) loadingMsg.remove();

  // Add assistant message
  const html = (marked && typeof marked.parse === 'function')
    ? marked.parse(response)
    : response;

  const assistantMsg = document.createElement('div');
  assistantMsg.className = 'explainer-chat-message explainer-chat-assistant';
  assistantMsg.innerHTML = `<div class="explainer-chat-content">${html}</div>`;
  messagesContainer.appendChild(assistantMsg);

  // Add to conversation history
  conversationHistory.push({ role: 'assistant', content: response });

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function handleFollowUpError(error) {
  const messagesContainer = shadowRoot.querySelector('#chat-messages');
  if (!messagesContainer) return;

  // Remove loading message
  const loadingMsg = shadowRoot.querySelector('#chat-loading');
  if (loadingMsg) loadingMsg.remove();

  // Add error message
  const errorMsg = document.createElement('div');
  errorMsg.className = 'explainer-chat-message explainer-chat-error';
  errorMsg.innerHTML = `<p>❌ ${error}</p>`;
  messagesContainer.appendChild(errorMsg);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ============= END CHAT PANEL FUNCTIONS =============

// Add event listeners
function addModalEventListeners(modal) {
  modal.querySelectorAll('.explainer-close, .explainer-close-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      modalLocked = false;
      closeChatPanel();
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

  const followUpBtn = modal.querySelector('.explainer-followup-btn');
  if (followUpBtn) {
    followUpBtn.onclick = (e) => {
      e.preventDefault();
      openChatPanel();
    };
  }

  modal.onclick = (e) => {
    if (modalLocked) return;
    const content = modal.querySelector('.explainer-modal-content');
    const chatPanel = shadowRoot.querySelector('.explainer-chat-panel');
    if (content && !content.contains(e.target) && (!chatPanel || !chatPanel.contains(e.target))) {
      closeChatPanel();
      closeModal();
    }
  };
}

// Close modal
function closeModal() {
  if (currentModal && !isClosing) {
    isClosing = true;
    closeChatPanel();
    currentModal.classList.remove('explainer-show');

    setTimeout(() => {
      if (currentModal && shadowRoot.contains(currentModal)) {
        shadowRoot.removeChild(currentModal);
      }
      currentModal = null;
      isClosing = false;
      shadowHost.style.pointerEvents = 'none';
      conversationHistory = [];
      currentContext = { originalText: '', explanation: '', level: '' };
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
  chatPanelOpen = false;
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

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    /* Base Modal Styles */
    .explainer-modal {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .explainer-modal.explainer-show { opacity: 1; }
    
    /* Split view when chat is open */
    .explainer-modal.explainer-split-view {
      justify-content: flex-start;
      padding-left: 5%;
    }
    .explainer-modal.explainer-split-view .explainer-modal-content {
      max-width: 55%;
      margin-right: 20px;
    }
    
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
    
    .explainer-footer { 
      padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; 
      display: flex; gap: 12px; justify-content: space-between; align-items: center;
    }
    .explainer-footer-right { display: flex; gap: 12px; }
    
    .explainer-btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .explainer-btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .explainer-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .explainer-btn-secondary { background: white; color: #667eea; border: 2px solid #667eea; }
    .explainer-btn-chat { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
    .explainer-btn-chat:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
    
    .explainer-spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .explainer-loading-dots::after { content: ''; animation: dots 1.5s infinite; }
    @keyframes dots { 0%, 20% { content: ''; } 40% { content: '.'; } 60% { content: '..'; } 80%, 100% { content: '...'; } }
    .explainer-error-message { color: #dc2626; font-weight: 500; }
    .explainer-error-help { color: #64748b; font-size: 14px; }
    
    /* Markdown Styles */
    .explainer-content h1, .explainer-content h2, .explainer-content h3, .explainer-content h4 {
      margin: 1em 0 0.5em 0; font-weight: 600; color: #1e293b;
    }
    .explainer-content h1 { font-size: 1.5em; }
    .explainer-content h2 { font-size: 1.3em; }
    .explainer-content h3 { font-size: 1.15em; }
    .explainer-content p { margin: 0 0 1em 0; }
    .explainer-content ul, .explainer-content ol { margin: 0 0 1em 1.5em; padding: 0; }
    .explainer-content li { margin-bottom: 0.5em; }
    .explainer-content code {
      background: #f1f5f9; padding: 2px 6px; border-radius: 4px;
      font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.9em; color: #e11d48;
    }
    .explainer-content pre {
      background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px;
      overflow-x: auto; margin: 1em 0;
    }
    .explainer-content pre code { background: none; color: inherit; padding: 0; }
    .explainer-content blockquote {
      border-left: 4px solid #667eea; margin: 1em 0; padding-left: 16px;
      color: #64748b; font-style: italic;
    }
    .explainer-content strong { font-weight: 600; color: #1e293b; }
    .explainer-content em { font-style: italic; }
    .explainer-content a { color: #667eea; text-decoration: underline; }
    
    /* ============= CHAT PANEL STYLES ============= */
    .explainer-chat-panel {
      position: fixed;
      top: 50%;
      right: -400px;
      transform: translateY(-50%);
      width: 380px;
      max-height: 85vh;
      background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }
    .explainer-chat-panel.explainer-chat-show {
      right: 5%;
    }
    
    .explainer-chat-header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .explainer-chat-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .explainer-chat-close {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .explainer-chat-close:hover {
      background: rgba(255,255,255,0.3);
    }
    
    .explainer-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 300px;
      max-height: calc(85vh - 140px);
    }
    
    .explainer-chat-welcome {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      padding: 40px 20px;
    }
    
    .explainer-chat-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    .explainer-chat-user {
      align-self: flex-end;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .explainer-chat-user p { margin: 0; }
    
    .explainer-chat-assistant {
      align-self: flex-start;
      background: #f1f5f9;
      color: #334155;
      border-bottom-left-radius: 4px;
    }
    
    .explainer-chat-content { line-height: 1.6; }
    .explainer-chat-content p { margin: 0 0 0.5em 0; }
    .explainer-chat-content p:last-child { margin-bottom: 0; }
    .explainer-chat-content code {
      background: #e2e8f0; padding: 2px 4px; border-radius: 3px;
      font-size: 0.85em; color: #e11d48;
    }
    .explainer-chat-content pre {
      background: #1e293b; color: #e2e8f0; padding: 12px;
      border-radius: 8px; overflow-x: auto; margin: 0.5em 0;
    }
    .explainer-chat-content pre code { background: none; color: inherit; padding: 0; }
    .explainer-chat-content ul, .explainer-chat-content ol { margin: 0.5em 0 0.5em 1.2em; padding: 0; }
    .explainer-chat-content li { margin-bottom: 0.3em; }
    
    .explainer-chat-error {
      align-self: flex-start;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .explainer-chat-error p { margin: 0; }
    
    .explainer-chat-loading {
      padding: 16px;
    }
    .explainer-chat-typing {
      display: flex;
      gap: 4px;
    }
    .explainer-chat-typing span {
      width: 8px;
      height: 8px;
      background: #94a3b8;
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }
    .explainer-chat-typing span:nth-child(1) { animation-delay: 0s; }
    .explainer-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
    .explainer-chat-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-8px); }
    }
    
    .explainer-chat-input-container {
      padding: 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .explainer-chat-input {
      flex: 1;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
      resize: none;
      outline: none;
      font-family: inherit;
      max-height: 120px;
      transition: border-color 0.2s;
    }
    .explainer-chat-input:focus {
      border-color: #667eea;
    }
    .explainer-chat-input::placeholder {
      color: #94a3b8;
    }
    .explainer-chat-send {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .explainer-chat-send:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    /* Mobile responsive */
    @media (max-width: 900px) {
      .explainer-modal.explainer-split-view {
        flex-direction: column;
        padding: 20px;
        justify-content: flex-start;
      }
      .explainer-modal.explainer-split-view .explainer-modal-content {
        max-width: 100%;
        max-height: 45vh;
        margin-right: 0;
        margin-bottom: 10px;
      }
      .explainer-chat-panel {
        position: relative;
        top: auto;
        right: auto !important;
        transform: none;
        width: 100%;
        max-height: 40vh;
      }
      .explainer-chat-panel.explainer-chat-show {
        right: auto !important;
      }
    }
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
