import {
    HF_API_KEY,
    HF_ENDPOINT,
    getNextModel,
    DEFAULT_HF_MODEL
} from './secrets.js';

/**
 * Simplifies text using the Hugging Face Chat Completion API.
 * @param {string} text - The text to simplify.
 * @param {string} level - Explanation level (grade5, highschool, college, expert).
 * @returns {Promise<string>}
 */
export async function simplifyText(text, level) {
    if (!HF_API_KEY || !HF_ENDPOINT) {
        throw new Error('Hugging Face API key or endpoint not configured.');
    }

    const modelName = getNextModel() || DEFAULT_HF_MODEL;

    const systemPrompts = {
        grade5: `Explain things to a 5th grader using simple words, short sentences, and fun examples.`,
        highschool: `Explain clearly for a high school student using simple academic language.`,
        college: `Explain for a college student with structure, clarity, and moderate depth.`,
        expert: `Provide a deeply technical, expert-level explanation using precise terminology.`
    };

    const systemPrompt =
        systemPrompts[level] || systemPrompts.highschool;

    const response = await fetch(HF_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `Please explain the following text:\n\n"${text}"`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `Hugging Face API Error: ${errorData.error?.message || 'Service unavailable'}`
        );
    }

    const data = await response.json();

    return (
        data?.choices?.[0]?.message?.content ||
        'No explanation returned.'
    );
}

/**
 * Handles follow-up questions while maintaining conversation context.
 * @param {string} question - User follow-up question.
 * @param {Object} context - Original context { originalText, explanation, level }.
 * @param {Array} history - Conversation history.
 * @returns {Promise<string>}
 */
export async function askFollowUp(question, context, history) {
    if (!HF_API_KEY || !HF_ENDPOINT) {
        throw new Error('Hugging Face API key or endpoint not configured.');
    }

    const modelName = getNextModel() || DEFAULT_HF_MODEL;

    const levelDescriptions = {
        grade5: 'a 5th grader using very simple language',
        highschool: 'a high school student',
        college: 'a college student',
        expert: 'an expert audience'
    };

    const systemPrompt = `You are a helpful AI assistant explaining concepts to ${
        levelDescriptions[context.level] || levelDescriptions.highschool
    }. Maintain clarity, accuracy, and the same explanation level.`;

    const messages = [
        { role: "system", content: systemPrompt },
        {
            role: "user",
            content: `Original text:\n"${context.originalText}"`
        },
        {
            role: "assistant",
            content: context.explanation
        },
        ...history.map(msg => ({
            role: msg.role,
            content: msg.content
        })),
        {
            role: "user",
            content: question
        }
    ];

    const response = await fetch(HF_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: modelName,
            messages
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `Hugging Face API Error: ${errorData.error?.message || 'Service unavailable'}`
        );
    }

    const data = await response.json();

    return (
        data?.choices?.[0]?.message?.content ||
        'No response returned.'
    );
}
