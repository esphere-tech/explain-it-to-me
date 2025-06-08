// background.js

// 1) When the extension is installed, build your context‐menu hierarchy
chrome.runtime.onInstalled.addListener(() => {
  const levels = [
    { id: 'grade5',     title: '🎈 Like I\'m 5 years old' },
    { id: 'highschool', title: '🎓 High School Level' },
    { id: 'college',    title: '🏛️ College Level' },
    { id: 'expert',     title: '🔬 Expert Analysis' }
  ];

  chrome.contextMenus.create({
    id: 'explainItToMe',
    title: '✨ Explain It to Me',
    contexts: ['selection']
  });

  levels.forEach(lvl => {
    chrome.contextMenus.create({
      id: lvl.id,
      parentId: 'explainItToMe',
      title: lvl.title,
      contexts: ['selection']
    });
  });
});

// 2) On click: inject content.js, then send the loading → result/error
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.parentMenuItemId !== 'explainItToMe' || !tab?.id) return;
  const level = info.menuItemId;
  const text  = info.selectionText;

  // remember last level
  await chrome.storage.local.set({ lastUsedLevel: level });

  // inject your content script right now
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    console.error('Could not inject content.js:', err);
    return;                   // if inject fails, abort
  }

  // tell it to show loading spinner
  chrome.tabs.sendMessage(tab.id, {
    action: 'showLoading',
    level
  }).catch(err => {
    console.warn('sendMessage(showLoading) failed:', err.message);
  });

  // call your AI…
  try {
    const explanation = await simplifyText(text, level);

    chrome.tabs.sendMessage(tab.id, {
      action: 'showExplanation',
      explanation,
      originalText: text,
      level
    }).catch(err => {
      console.warn('sendMessage(showExplanation) failed:', err.message);
    });

  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showError',
      error: error.message
    }).catch(err => {
      console.warn('sendMessage(showError) failed:', err.message);
    });
  }
});


// ——————————————
// Your existing simplifyText() goes here verbatim
// ——————————————

async function simplifyText(text, level) {
  const API_KEY = 'AZURE_API_KEY';
  const ENDPT   = 'AZURE_ENDPOINT';

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

  const res = await fetch(ENDPT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompts[level] },
        { role: 'user',   content: text }
      ],
      max_tokens: 600,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'API error');
  }
  const data = await res.json();
  console.log(data.choices[0].message.content)
  return data.choices[0].message.content;
}


// 3) Allow popup/content.js to query lastUsedLevel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLastUsedLevel') {
    chrome.storage.local.get('lastUsedLevel')
      .then(r => sendResponse({ lastUsedLevel: r.lastUsedLevel || 'highschool' }));
    return true;  // keep sendResponse alive
  }
});
