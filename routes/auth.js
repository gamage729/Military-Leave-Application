const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

let refreshTokens = []; // Store refresh tokens (use DB in production)

// Register a New User

router.post("/register", async (req, res) => {
    const { name, rank, role, email, password } = req.body;

    if (!name || !rank || !role || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (name, rank, role, email, password) VALUES (?, ?, ?, ?, ?)";
        
        db.query(sql, [name, rank, role, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ error: "Database error", details: err });
            res.json({ message: "User registered successfully!" });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});


// User Login

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });

        if (results.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate Access & Refresh Tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET);
        refreshTokens.push(refreshToken);

        res.json({ accessToken, refreshToken, user });
    });
});


// Generate Access Token

function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );
}


// Refresh Token Route

router.post("/refresh", (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: "No token provided" });
    if (!refreshTokens.includes(token)) return res.status(403).json({ error: "Invalid refresh token" });

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid refresh token" });

        const newAccessToken = generateAccessToken(user);
        res.json({ accessToken: newAccessToken });
    });
});


// Logout Route

router.post("/logout", (req, res) => {
    const { token } = req.body;
    refreshTokens = refreshTokens.filter(t => t !== token);
    res.json({ message: "Logged out successfully" });
});

module.exports = router;
