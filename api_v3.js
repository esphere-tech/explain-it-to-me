import { NVIDIA_API_KEY, NVIDIA_ENDPOINT } from './secrets.js';

/**
 * Simplifies text using the NVIDIA API.
 * @param {string} text - The text to simplify.
 * @param {string} level - The explanation level (grade5, highschool, college, expert).
 * @returns {Promise<string>} - The explanation as a string.
 */
export async function simplifyText(text, level) {
    if (!NVIDIA_API_KEY || !NVIDIA_ENDPOINT) {
        throw new Error('NVIDIA API key or endpoint not configured.');
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

    const prompt = `${systemPrompts[level] || systemPrompts.highschool}\n\nPlease explain this text in detail: "${text}"`;

    const response = await fetch(NVIDIA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'mistralai/mistral-nemotron',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.6,
            top_p: 0.7,
            frequency_penalty: 0,
            presence_penalty: 0,
            max_tokens: 4096,
            stream: false
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`NVIDIA API Error: ${errorData.error?.message || 'Service temporarily unavailable'}`);
    }

    const data = await response.json();
    // NVIDIA's response format: data.choices[0].message.content
    return data.choices?.[0]?.message?.content || 'No explanation returned.';
}
