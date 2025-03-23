const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { handleLeaveRequest } = require("../src/controllers/leaveController");
const { getAIResponse } = require("../src/services/deepseek");

const router = express.Router();

const conversationHistory = []; // Store conversation context

// AI Leave Analysis Route (No authentication required)
router.post("/analyze", async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: "Leave reason is required." });
        }
  
        // Store user message in conversation history
        conversationHistory.push({ role: "user", content: reason });
  
        // Get AI military-specific response
        const aiResponse = await getAIResponse(reason, conversationHistory);
  
        // Store AI response for conversation tracking
        conversationHistory.push({ role: "assistant", content: aiResponse });
  
        res.json({ suggestion: aiResponse });
    } catch (error) {
        console.error("AI Processing Error:", error);
        res.status(500).json({ error: "Failed to analyze leave request." });
    }
});

// Admin: Get All Leave Requests
router.get("/all", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const sql = "SELECT * FROM leave_requests";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Database error." });
        }
        res.json(results);
    });
});

// Admin Override Leave Decision
router.put("/override", authenticateToken, authorizeRoles("admin"), (req, res) => {
    const { id, admin_override } = req.body;

    if (!id || !admin_override) {
        return res.status(400).json({ error: "ID and admin override decision are required." });
    }

    const sql = "UPDATE leave_requests SET admin_override = ? WHERE id = ?";
    db.query(sql, [admin_override, id], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Database error." });
        }
        res.json({ message: "Leave request override updated." });
    });
});

module.exports = router;
