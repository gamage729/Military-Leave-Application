const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();
require("dotenv").config();

let refreshTokens = [];

// Refresh Token Route
router.post("/", (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: "No token provided" });
    if (!refreshTokens.includes(token)) return res.status(403).json({ error: "Invalid refresh token" });

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid refresh token" });

        const newAccessToken = jwt.sign(
            { id: user.id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        res.json({ accessToken: newAccessToken });
    });
});

module.exports = router;
