const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();


// Soldier Request Leave

router.post("/request", authenticateToken, authorizeRoles("soldier"), async (req, res) => {
    const { user_id, reason } = req.body;

    if (!user_id || !reason) {
        return res.status(400).json({ error: "User ID and reason are required." });
    }

    const status = "pending";  // Default status (without OpenAI)
    const decision_by_gpt = "Pending"; // Placeholder since AI is disabled

    const sql = "INSERT INTO leave_requests (user_id, reason, status, decision_by_gpt) VALUES (?, ?, ?, ?)";
    db.query(sql, [user_id, reason, status, decision_by_gpt], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Database error." });
        }
        res.json({ message: "Leave request submitted", status });
    });
});


//  Admin: Get All Leave Requests

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


//Admin Override Leave Decision

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
