const express = require("express");
const db = require("../config/db");
const { OpenAI } = require("openai");

const router = express.Router();

// Ensure API key exists before initializing OpenAI to prevent runtime errors
const openaiApiKey = process.env.OPENAI_API_KEY;

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

router.post("/request", async (req, res) => {
    const { user_id, reason } = req.body;

    let status = "pending";  // Default status if OpenAI API is unavailable
    let decision = "Pending";

    if (openai) {
        try {
            // AI Analysis
            const response = await openai.completions.create({
                model: "gpt-4",
                prompt: `Evaluate this leave request reason: "${reason}". Approve if it's a valid reason like medical, family emergency, training. Reply "Approved" or "Rejected".`,
                max_tokens: 10,
            });

            decision = response.choices[0].text.trim();
            status = decision === "Approved" ? "approved" : "rejected";
        } catch (error) {
            console.error("OpenAI API Error:", error.message);
        }
    } else {
        console.warn("OpenAI API Key is missing. Defaulting to pending.");
    }

    const sql = "INSERT INTO leave_requests (user_id, reason, status, decision_by_gpt) VALUES (?, ?, ?, ?)";
    db.query(sql, [user_id, reason, status, decision], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Leave request submitted", status });
    });
});

router.get("/all", (req, res) => {
    const sql = "SELECT * FROM leave_requests";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

router.put("/override", (req, res) => {
    const { id, admin_override } = req.body;
    const sql = "UPDATE leave_requests SET admin_override = ? WHERE id = ?";
    db.query(sql, [admin_override, id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Override updated" });
    });
});

module.exports = router;
