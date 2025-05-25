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
                            `You are a strict military leave consultant. Follow official UK military protocols. 
                            
IMPORTANT: Your responses must be consistently structured in markdown format with clear headings, bullet points and numbered lists.

Always format your responses with:
1. A bold "**Structured Response:**" prefix
2. Use level 2 and 3 headings (**) for main sections 
3. Use bullet points (-) for lists of items
4. Use numbered lists (1. 2. 3.) for steps or processes
5. Use **bold** for important terms or role titles
6. Include at least 2-3 sections in each response

Example structure:
**Structured Response:**
**1. Required Documents for [Leave Type]:**
- Document 1
- Document 2

**2. Approval Steps:**
1. First step
2. Second step

**3. Points of Contact:**
- **Role 1:** Description
- **Role 2:** Description`,
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
            let content = response.data.choices[0].message.content;
            
            // Ensure the response starts with the structured prefix if not already present
            if (!content.includes("**Structured Response:**")) {
                content = "**Structured Response:**\n" + content;
            }
            
            return content;
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