const express = require("express");
const db = require("../config/db");
const { OpenAI } = require("openai");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Submit Leave Request
router.post("/request", async (req, res) => {
    const { user_id, reason } = req.body;

    // AI Analysis
    const response = await openai.completions.create({
        model: "gpt-4",
        prompt: `Evaluate this leave request reason: "${reason}". Approve if it's a valid reason like medical, family emergency, training. Reply "Approved" or "Rejected".`,
        max_tokens: 10,
    });

    const decision = response.choices[0].text.trim();
    const status = decision === "Approved" ? "approved" : "rejected";

    const sql = "INSERT INTO leave_requests (user_id, reason, status, decision_by_gpt) VALUES (?, ?, ?, ?)";
    db.query(sql, [user_id, reason, status, decision], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Leave request submitted", status });
    });
});

// Get All Leave Requests
router.get("/all", (req, res) => {
    const sql = "SELECT * FROM leave_requests";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Admin Override
router.put("/override", (req, res) => {
    const { id, admin_override } = req.body;
    const sql = "UPDATE leave_requests SET admin_override = ? WHERE id = ?";
    db.query(sql, [admin_override, id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Override updated" });
    });
});

module.exports = router;
