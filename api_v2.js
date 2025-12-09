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

    const prompt = `${systemPrompts[level] || systemPrompts.highschool}

Please explain this text in detail: "${text}"`;

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
