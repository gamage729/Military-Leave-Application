const validator = require("validator");

// Middleware for validating user registration
// This middleware does NOT validate password since Firebase Auth handles that
function validateRegistration(req, res, next) {
    console.log("Registration validation - received body:", req.body); // Debug log
    
    const { name, email, rank, role, soldierId } = req.body;

    // Check if name exists and is a string of length 3-20
    if (!name || typeof name !== "string" || name.length < 3 || name.length > 20) {
        return res.status(400).json({ error: "Name must be a string between 3 and 20 characters." });
    }

    // Check if email exists and is a valid email string
    if (!email || typeof email !== "string" || !validator.isEmail(email)) {
        return res.status(400).json({ error: "Invalid or missing email." });
    }

    // Check if rank exists and is valid
    if (!rank || typeof rank !== "string") {
        return res.status(400).json({ error: "Rank is required." });
    }

    const allowedRanks = ['Private', 'Sergeant', 'Lieutenant', 'Captain', 'Major'];
    if (!allowedRanks.includes(rank)) {
        return res.status(400).json({ 
            error: `Invalid rank. Must be one of: ${allowedRanks.join(', ')}` 
        });
    }

    // Check if role exists and is valid
    if (!role || typeof role !== "string") {
        return res.status(400).json({ error: "Role is required." });
    }

    const allowedRoles = ['soldier', 'officer'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ 
            error: `Invalid role. Must be either: ${allowedRoles.join(' or ')}` 
        });
    }

    // Check if soldierId exists and is valid
    if (!soldierId || typeof soldierId !== "string" || soldierId.length < 3) {
        return res.status(400).json({ error: "Soldier ID must be at least 3 characters long." });
    }

    // Sanitize inputs
    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    req.body.rank = rank.trim();
    req.body.role = role.trim();
    req.body.soldierId = soldierId.trim();

    console.log("Registration validation passed"); // Debug log
    // All validations passed
    next();
}

// Middleware for validating user login
function validateLogin(req, res, next) {
    const { idToken } = req.body;

    // Check if idToken exists and is a string
    if (!idToken || typeof idToken !== "string" || idToken.trim().length === 0) {
        return res.status(400).json({ error: "ID token is required." });
    }

    // All validations passed
    next();
}

// Separate validation function for password (when needed for other operations)
function validatePassword(password) {
    if (!password || typeof password !== "string") {
        return "Password is required.";
    }

    // Password validation regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password.match(passwordRegex)) {
        return "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
    }

    return null; // No error
}

// Middleware for validating password (for routes that need password validation)
function validatePasswordMiddleware(req, res, next) {
    const { password } = req.body;
    const passwordError = validatePassword(password);
    
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }
    
    next();
}

module.exports = { 
    validateRegistration, 
    validateLogin,
    validatePassword,
    validatePasswordMiddleware
};