import { HF_API_KEY, getHFModel } from './secrets.js';
const HF_MODEL = getHFModel();

/**
 * Simplifies text using an open-source model on Hugging Face.
 * @param {string} text - The text to simplify.
 * @param {string} level - The explanation level (grade5, highschool, college, expert).
 * @returns {Promise<string>} - The explanation in Markdown.
 */
export async function simplifyText(text, level) {
    if (!HF_API_KEY || HF_API_KEY === 'YOUR_HF_API_KEY_HERE') {
        throw new Error('Hugging Face API key not configured.');
    }

    const systemPrompts = {
        grade5: `Explain the content to a 5th grader using simple words, short sentences, and fun examples.`,
        highschool: `Explain clearly for high school students. Use simple academic terms and relatable examples.`,
        college: `Explain for college students with solid academic detail and clear structure.`,
        expert: `Provide an expert-level explanation using technical depth and professional tone.`
    };

    const prompt = `
### Instruction:
${systemPrompts[level]}

### Content:
${text}

### Explanation:
`;

    const response = await fetch(
        `https://router.huggingface.co/models/${HF_MODEL}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 600,
                    temperature: 0.7,
                    return_full_text: false
                }
            })
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Hugging Face API error');
    }

    const data = await response.json();

    // Hugging Face returns an array of generated outputs
    return data[0]?.generated_text?.trim();
}
