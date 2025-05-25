// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../firebase"); 
const { validateRegistration } = require("../middleware/validation");
const rateLimit = require("express-rate-limit");
const securityMiddleware = require("../middleware/security");

const router = express.Router();
securityMiddleware(router);

let refreshTokens = [];

// Rate Limiting for Login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later.",
    handler: (req, res) => {
        console.log("Rate limit reached for:", req.ip);
        res.status(429).json({ error: "Too many login attempts, please try again later." });
    },
});


router.get('/debug-announcements', (req, res) => {
    console.log('Debug route was hit!');
    res.json({ 
      success: true, 
      message: 'Debug route is working',
      timestamp: new Date().toISOString() 
    });
  });
// Register a New User
router.post("/register", validateRegistration, async (req, res) => {
    const { name, rank, role, email, password } = req.body;

    try {
        const userRef = db.collection("users");
        const snapshot = await userRef.where("email", "==", email).get();

        if (!snapshot.empty) {
            return res.status(400).json({ error: "Email already in use" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password.match(passwordRegex)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, 1 number, and 1 special character."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { 
            name, 
            rank, 
            role, 
            email, 
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        const addedUser = await userRef.add(newUser);
        res.json({ message: "User registered successfully!", id: addedUser.id });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
});

// Login
router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const userRef = db.collection("users");
        const snapshot = await userRef.where("email", "==", email).get();

        if (snapshot.empty) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Create payload for JWT
        const payload = { 
            id: userDoc.id, 
            role: user.role,
            email: user.email,
            name: user.name
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = jwt.sign(
            { id: userDoc.id }, 
            process.env.REFRESH_TOKEN_SECRET, 
            { expiresIn: "7d" }
        );

        refreshTokens.push(refreshToken);

        // Don't send password back to client
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({ 
            accessToken, 
            refreshToken, 
            user: { 
                id: userDoc.id, 
                ...userWithoutPassword 
            },
            message: "Login successful"
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed", details: error.message });
    }
});

// Generate Access Token
function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
}

// Refresh Token Route
router.post("/refresh", (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: "No refresh token provided" });
    }
    
    if (!refreshTokens.includes(token)) {
        return res.status(403).json({ error: "Invalid refresh token" });
    }

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            // Remove invalid token
            refreshTokens = refreshTokens.filter(t => t !== token);
            return res.status(403).json({ error: "Invalid refresh token" });
        }

        try {
            // Get fresh user data
            const userRef = db.collection("users").doc(decoded.id);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                refreshTokens = refreshTokens.filter(t => t !== token);
                return res.status(403).json({ error: "User not found" });
            }

            const user = userDoc.data();
            const payload = {
                id: decoded.id,
                role: user.role,
                email: user.email,
                name: user.name
            };

            const newAccessToken = generateAccessToken(payload);
            res.json({ accessToken: newAccessToken });
        } catch (error) {
            console.error("Refresh token error:", error);
            res.status(500).json({ error: "Failed to refresh token" });
        }
    });
});

// Logout Route
router.post("/logout", (req, res) => {
    const { token } = req.body;
    refreshTokens = refreshTokens.filter(t => t !== token);
    res.json({ message: "Logged out successfully" });
});

// Verify Token Route (for debugging)
router.get("/verify", (req, res) => {
    const authHeader = req.header("Authorization") || req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ") 
        ? authHeader.split(" ")[1] 
        : authHeader;

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(403).json({ valid: false, error: err.message });
    }
});


module.exports = router;