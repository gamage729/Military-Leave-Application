const axios = require("axios");
require("dotenv").config();

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

async function getAIResponse(userMessage, conversationHistory = []) {
    try {
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a strict military leave consultant. Follow official military protocols when approving leave requests. Provide structured responses, including required documents, approval steps, and officers to contact.this is UK army" },
                    ...conversationHistory,
                    { role: "user", content: userMessage }
                ],
                temperature: 0.3, // Reduce randomness for structured responses
                max_tokens: 500
            },
            {
                headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("DeepSeek API Error:", error);
        return "Error retrieving AI response.";
    }
}

module.exports = { getAIResponse };
