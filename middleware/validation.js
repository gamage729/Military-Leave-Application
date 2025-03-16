const validator = require("validator");

// Middleware for validating user registration
function validateRegistration(req, res, next) {
    const { name, email, password } = req.body;

    // Name validation (3-20 characters)
    if (!name || name.length < 3 || name.length > 20) {
        return res.status(400).json({ error: "Name must be between 3 and 20 characters." });
    }

    // Email validation
    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
    }

    // Password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password.match(passwordRegex)) {
        return res.status(400).json({
            error: "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, 1 number, and 1 special character."
        });
    }

    next(); // Move to the next middleware
}

module.exports = { validateRegistration };
