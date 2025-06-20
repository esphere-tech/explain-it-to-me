import { API_KEY, ENDPOINT } from './secrets.js';

/**
 * Simplifies text using the pre-configured ChatGPT API.
 * @param {string} text - The text to simplify.
 * @param {string} level - The explanation level (grade5, highschool, college, expert).
 * @returns {Promise<string>} - The explanation in Markdown.
 */
export async function simplifyText(text, level) {
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
    // The explanation is returned in Markdown format.
    return data.choices[0].message.content;
}
