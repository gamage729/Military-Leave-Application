const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const expressSanitizer = require("express-sanitizer");
const xssClean = require("xss-clean");

// Rate Limiting (Prevent Abuse)

// Strict limit for login attempts (5 per 15 minutes)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Allow max 5 login attempts
    message: "Too many login attempts. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limit (100 requests per 15 minutes)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// Limit leave request submissions (3 per day)
const leaveRequestLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3, // Allow max 3 leave requests per day
    message: "You can only submit 3 leave requests per day.",
    standardHeaders: true,
    legacyHeaders: false,
});

// Security Middleware
const securityMiddleware = (app) => {
    app.use(helmet()); // Secure HTTP headers
    app.use(cors()); // Enable CORS
    app.use(expressSanitizer()); // Prevent SQL Injection
    app.use(xssClean()); // Prevent XSS Attacks

    // Apply rate limits to specific routes
    app.use("/api/login", loginLimiter); // Apply stricter limit to login
    app.use("/api", apiLimiter); // Apply general API limit
    app.use("/api/leave-request", leaveRequestLimiter); // Apply leave request limit
};

module.exports = securityMiddleware;
