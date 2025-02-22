const express = require("express");
const bcrypt = require("bcryptjs"); // Library for hashing passwords
const jwt = require("jsonwebtoken"); // Library for generating JWT tokens
const db = require("../config/db"); // Database connection

const router = express.Router();


// Register a New User

router.post("/register", async (req, res) => {
    const { name, rank, role, email, password } = req.body;

    // Validate required fields
    if (!name || !rank || !role || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Hash the password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // SQL query to insert a new user into the database
        const sql = "INSERT INTO users (name, rank, role, email, password) VALUES (?, ?, ?, ?, ?)";
        db.query(sql, [name, rank, role, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json(err); // Handle database errors
            res.json({ message: "User registered successfully!" }); // Success response
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// ==========================
// User Login
// ==========================
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    // SQL query to find the user by email
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json(err); // Handle database errors

        // Check if user exists
        if (results.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = results[0]; // Extract user data from the query result

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" }); // Invalid password
        }

        // Generate a JWT token for authentication
        const token = jwt.sign(
            { id: user.id, role: user.role }, // Payload (user ID and role)
            process.env.JWT_SECRET, // Secret key stored in environment variables
            { expiresIn: "1h" } // Token expiration time
        );

        res.json({ token, user }); // Send token and user data in response
    });
});

module.exports = router; // Export the router for use in other files
