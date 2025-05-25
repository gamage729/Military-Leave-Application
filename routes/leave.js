const express = require("express");
const db = require("../firebase");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { handleLeaveRequest } = require("../src/controllers/leaveController");
const getAIResponse = require('../src/services/deepseek');

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

// Admin: Get All Leave Requests (Firestore)
router.get("/all", authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const snapshot = await db.collection("leave_requests").get();
        const leaveRequests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(leaveRequests);
    } catch (err) {
        console.error("Firestore Error:", err);
        res.status(500).json({ error: "Failed to retrieve leave requests." });
    }
});

// Admin Override Leave Decision (Firestore)
router.put("/override", authenticateToken, authorizeRoles("admin"), async (req, res) => {
    const { id, admin_override } = req.body;

    if (!id || !admin_override) {
        return res.status(400).json({ error: "ID and admin override decision are required." });
    }

    try {
        const leaveRef = db.collection("leave_requests").doc(id);
        const doc = await leaveRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Leave request not found." });
        }

        await leaveRef.update({ admin_override });
        res.json({ message: "Leave request override updated." });
    } catch (err) {
        console.error("Firestore Update Error:", err);
        res.status(500).json({ error: "Failed to update leave request." });
    }
});

module.exports = router;
