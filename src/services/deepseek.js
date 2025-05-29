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
                    {
                        role: "system",
                        content:
                            "You are a strict military leave consultant. Follow official UK military protocols. Provide structured responses, required documents, approval steps, and officers to contact.",
                    },
                    ...conversationHistory,
                    { role: "user", content: userMessage },
                ],
                temperature: 0.3,
                max_tokens: 500,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // Log the full response to check if it's formatted correctly
        console.log("DeepSeek Response:", response.data);

        if (
            response.data &&
            response.data.choices &&
            response.data.choices[0] &&
            response.data.choices[0].message &&
            response.data.choices[0].message.content
        ) {
            return response.data.choices[0].message.content;
        } else {
            console.error("Unexpected DeepSeek response format:", response.data);
            return "Error: Unexpected response from AI.";
        }
    } catch (error) {
        console.error("DeepSeek API Error:", error.response?.data || error.message);
        return "Error retrieving AI response.";
    }
}

module.exports = getAIResponse;
