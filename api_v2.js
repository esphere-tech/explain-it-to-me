import { 
    GEMINI_API_KEY, 
    GEMINI_ENDPOINT, 
    getNextModel, 
    DEFAULT_GEMINI_MODEL 
} from './secrets.js';

/**
 * Simplifies text using the Gemini API.
 * @param {string} text - The text to simplify.
 * @param {string} level - The explanation level (grade5, highschool, college, expert).
 * @returns {Promise<string>} - The explanation.
 */
export async function simplifyText(text, level) {
    if (!GEMINI_API_KEY || !GEMINI_ENDPOINT) {
        throw new Error('Gemini API key or endpoint not configured.');
    }

    // Get rotating model (flash → flash-8b → pro → repeat)
    const modelName = getNextModel() || DEFAULT_GEMINI_MODEL;

    const systemPrompts = {
        grade5: `You are an expert at explaining complex topics to 5th graders (ages 10-11).
                 Use simple words, short sentences, fun analogies, and avoid jargon.`,
        highschool: `Explain clearly for high school students using simple academic language 
                     and relatable examples.`,
        college: `Explain for college students with academic clarity, structure, and depth.`,
        expert: `Provide an expert-level, deeply technical explanation using correct terminology.`
    };

    const prompt = `${systemPrompts[level] || systemPrompts.highschool} Please explain this text in detail: "${text}"`;

    // Correct Gemini endpoint:
    const url = `${GEMINI_ENDPOINT}/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API Error: ${errorData.error?.message || 'Service temporarily unavailable'}`);
    }

    const data = await response.json();

    // Gemini returns: data.candidates[0].content.parts[0].text
    return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No explanation returned.'
    );
}

/**
 * Handle follow-up questions in a conversation.
 * @param {string} question - The follow-up question.
 * @param {Object} context - The original context (originalText, explanation, level).
 * @param {Array} history - Conversation history.
 * @returns {Promise<string>} - The response.
 */
export async function askFollowUp(question, context, history) {
    if (!GEMINI_API_KEY || !GEMINI_ENDPOINT) {
        throw new Error('Gemini API key or endpoint not configured.');
    }

    const modelName = getNextModel() || DEFAULT_GEMINI_MODEL;

    const levelDescriptions = {
        grade5: 'a 5th grader (simple language, fun analogies)',
        highschool: 'a high school student (clear, relatable)',
        college: 'a college student (academic, structured)',
        expert: 'an expert (technical, precise)'
    };

    const levelDesc = levelDescriptions[context.level] || levelDescriptions.highschool;

    // Build conversation context
    const conversationContext = history.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');

    const prompt = `You are a helpful AI assistant continuing a conversation about explaining text to ${levelDesc}.

Original text being discussed: "${context.originalText}"

Previous conversation:
${conversationContext}

User's new question: ${question}

Please provide a helpful, clear response that maintains the same explanation level. Keep your response focused and concise.`;

    const url = `${GEMINI_ENDPOINT}/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API Error: ${errorData.error?.message || 'Service temporarily unavailable'}`);
    }

    const data = await response.json();

    return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No response returned.'
    );
}
