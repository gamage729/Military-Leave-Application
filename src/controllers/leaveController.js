const { getAIResponse } = require("../services/deepseek");

async function handleLeaveRequest(req, res) {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: "Leave reason is required." });
        }

        // Get AI-generated response based on leave reason
        const aiResponse = await getAIResponse(reason);
        return res.json({ suggestion: aiResponse });  // Send the response back to the client
    } catch (error) {
        console.error("AI Processing Error:", error);
        return res.status(500).json({ error: "Failed to analyze leave request." });
    }
}

module.exports = { handleLeaveRequest };
