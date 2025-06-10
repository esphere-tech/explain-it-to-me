// Background script for handling API calls and context menus
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items for different simplification levels
  const levels = [
    { id: 'grade5', title: '🎈 Like I\'m 5 years old', emoji: '🎈' },
    { id: 'highschool', title: '🎓 High School Level', emoji: '🎓' },
    { id: 'college', title: '🏛️ College Level', emoji: '🏛️' },
    { id: 'expert', title: '🔬 Expert Analysis', emoji: '🔬' }
  ];

  // Create parent menu item
  chrome.contextMenus.create({
    id: 'explainItToMe',
    title: '✨ Explain It to Me',
    contexts: ['selection']
  });

  // Create submenu items for each level
  levels.forEach(level => {
    chrome.contextMenus.create({
      id: level.id,
      parentId: 'explainItToMe',
      title: level.title,
      contexts: ['selection']
    });
  });
});

// Ensure content script is injected and ready
async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
    // Content script not ready, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['content.css']
      });
      
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try to ping again
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return true;
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      return false;
    }
  }
}

// Send message with retry logic
async function sendMessageWithRetry(tabId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      console.warn(`Message attempt ${i + 1} failed:`, error.message);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Try to ensure content script is ready before retrying
      await ensureContentScript(tabId);
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.parentMenuItemId === 'explainItToMe' && tab?.id) {
    const selectedText = info.selectionText;
    const level = info.menuItemId;
    
    try {
      // Store the last used level
      await chrome.storage.local.set({ lastUsedLevel: level });
      
      // Ensure content script is ready
      const isReady = await ensureContentScript(tab.id);
      if (!isReady) {
        console.error('Could not prepare content script');
        return;
      }
      
      // Send loading message
      await sendMessageWithRetry(tab.id, {
        action: 'showLoading',
        level: level
      });
      
      // Get explanation from API
      const explanation = await simplifyText(selectedText, level);
      
      // Send the result to content script
      await sendMessageWithRetry(tab.id, {
        action: 'showExplanation',
        explanation: explanation,
        originalText: selectedText,
        level: level
      });
      
      // Update usage statistics
      await updateUsageStats(level);
      
    } catch (error) {
      console.error('Error processing explanation:', error);
      
      // Try to send error message
      try {
        await sendMessageWithRetry(tab.id, {
          action: 'showError',
          error: error.message || 'Something went wrong. Please try again.'
        });
      } catch (msgError) {
        console.error('Failed to send error message:', msgError);
        // Fallback: show browser notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Explain It to Me',
          message: 'Failed to process explanation. Please try again.'
        });
      }
    }
  }
});

// Function to simplify text using pre-configured ChatGPT API
async function simplifyText(text, level) {
  // Using pre-configured API key - no user input needed
  

  const API_KEY = 'YOUR_PRECONFIGURED_API_KEY_HERE'; // Replace with your actual API key
  const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  
  if (!API_KEY || API_KEY === 'YOUR_PRECONFIGURED_API_KEY_HERE') {
    throw new Error('API key not configured. Please set up your ChatGPT API key.');
  }
  
  const systemPrompts = {
    grade5: `You are an expert at explaining complex topics to 5th graders (ages 10-11). 
             Break down the text using simple words, short sentences, and relatable examples. 
             Use analogies that kids would understand. Avoid jargon and technical terms.
             Make it fun and engaging while being accurate.`,
    
    highschool: `You are explaining to high school students (ages 14-18). 
                 Use clear, conversational language while introducing some academic vocabulary. 
                 Include relevant examples and context that teenagers can relate to. 
                 Maintain accuracy while making complex concepts accessible.`,
    
    college: `You are explaining to college students who have general academic knowledge. 
              Use appropriate academic vocabulary and assume familiarity with basic concepts in various fields. 
              Provide thorough explanations with nuanced details while remaining clear and organized.`,
    
    expert: `You are providing an expert-level explanation for professionals and specialists. 
             Use technical terminology appropriately and provide comprehensive analysis. 
             Include relevant context, implications, and connections to broader concepts in the field.`
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompts[level]
        },
        {
          role: 'user',
          content: `Please explain this text in detail: "${text}"`
        }
      ],
      max_tokens: 600,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${errorData.error?.message || 'Service temporarily unavailable'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Update usage statistics
async function updateUsageStats(level) {
  try {
    const result = await chrome.storage.local.get(['explanationCount', 'levelUsage']);
    
    const newCount = (result.explanationCount || 0) + 1;
    const levelUsage = result.levelUsage || {};
    levelUsage[level] = (levelUsage[level] || 0) + 1;
    
    await chrome.storage.local.set({
      explanationCount: newCount,
      levelUsage: levelUsage
    });
  } catch (error) {
    console.error('Failed to update usage statistics:', error);
  }
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLastUsedLevel') {
    chrome.storage.local.get(['lastUsedLevel']).then(result => {
      sendResponse({ lastUsedLevel: result.lastUsedLevel || 'highschool' });
    }).catch(error => {
      sendResponse({ lastUsedLevel: 'highschool' });
    });
    return true; // Keep sendResponse alive for async response
  }
  
  if (request.action === 'getUsageStats') {
    chrome.storage.local.get(['explanationCount', 'levelUsage']).then(result => {
      sendResponse({ 
        explanationCount: result.explanationCount || 0,
        levelUsage: result.levelUsage || {}
      });
    }).catch(error => {
      sendResponse({ 
        explanationCount: 0,
        levelUsage: {}
      });
    });
    return true;
  }
});