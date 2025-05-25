// middleware/auth.js
const jwt = require("jsonwebtoken");

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.header("Authorization") || req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    // Handle both "Bearer token" and just "token" formats
    const token = authHeader.startsWith("Bearer ") 
        ? authHeader.split(" ")[1] 
        : authHeader;

    if (!token) {
        return res.status(401).json({ error: "Access denied. Invalid token format." });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: "Invalid token" });
        } else {
            return res.status(500).json({ error: "Token verification failed" });
        }
    }
};

// Middleware to restrict access based on role
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: "Access denied. Insufficient permissions.",
                required: allowedRoles,
                current: req.user.role 
            });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };