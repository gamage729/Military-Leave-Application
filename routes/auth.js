const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { validateRegistration } = require("../middleware/validation");
const rateLimit = require("express-rate-limit");
const securityMiddleware = require("../middleware/security");

const router = express.Router();
securityMiddleware(router);

let refreshTokens = [];

// Rate Limiting for Login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Allow only 5 attempts per IP
    message: "Too many login attempts, please try again later.",
    handler: (req, res) => {
        console.log("Rate limit reached for:", req.ip);
        res.status(429).json({ error: "Too many login attempts, please try again later." });
    },
});

// Register a New User
router.post("/register", validateRegistration, async (req, res) => {
    const { name, rank, role, email, password } = req.body;

    try {
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) return res.status(500).json({ error: "Database error", details: err });
            if (results.length > 0) return res.status(400).json({ error: "Email already in use" });

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!password.match(passwordRegex)) {
                return res.status(400).json({
                    error: "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, 1 number, and 1 special character."
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = "INSERT INTO users (name, rank, role, email, password) VALUES (?, ?, ?, ?, ?)";

            db.query(sql, [name, rank, role, email, hashedPassword], (err) => {
                if (err) return res.status(500).json({ error: "Database error", details: err });
                res.json({ message: "User registered successfully!" });
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error", details: error.message });
    }
});

// Updated User Login (Now shows "Incorrect password" when applicable)
router.post("/login", loginLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });

        if (results.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Incorrect password" }); // CLEAR MESSAGE
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

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
