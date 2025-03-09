const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const expressSanitizer = require("express-sanitizer");
const xssClean = require("xss-clean");

//Rate Limiting (Prevent Abuse)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests
    message: "Too many requests, please try again later."
});

//Security Middleware
const securityMiddleware = (app) => {
    app.use(helmet()); // Secure HTTP headers
    app.use(cors()); // Enable CORS
    app.use(expressSanitizer()); // Prevent SQL Injection
    app.use(xssClean()); // Prevent XSS Attacks
    app.use(limiter); // Apply Rate Limiting
};

module.exports = securityMiddleware;
