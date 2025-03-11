const axios = require("axios");
require("dotenv").config(); // Load API key from .env file

const API_KEY = process.env.DEEPSEEK_API_KEY; // Load from environment variables
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL_NAME = "deepseek-chat"; // Default model

async function deepseekAPI(reason) {
    try {
        console.log("Sending AI request with reason:", reason);  // Debugging

        const prompt = `
            You are an AI assistant for a military leave approval system. 
            Your role is to analyze a soldier's leave request and provide a response based on military protocols.
            Consider factors such as duty responsibilities, emergency situations, medical conditions, and operational readiness.

            **Leave Request Details:**
            - **Reason:** ${reason}

            **Instructions for Response:**
            - Provide a professional, structured response suitable for military personnel.
            - Recommend necessary actions such as documentation, medical assessments, or command approval.
            - If leave is urgent, suggest the best way to proceed.
            - Keep responses concise and informative.

            Provide your response below:
        `;

        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: MODEL_NAME,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500
            },
            {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Received AI response:", response.data.choices[0].message.content);  // Debugging
        return response.data.choices[0].message.content || "No response generated.";
    } catch (error) {
        console.error("DeepSeek API Error:", error.response?.data || error.message);
        return "Error processing request. Please try again later.";
    }
}

// Main function that calls deepseekAPI()
async function getAIResponse(reason) {
    return await deepseekAPI(reason);
}

module.exports = { getAIResponse };
