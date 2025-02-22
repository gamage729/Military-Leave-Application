const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const db = require("./config/db");

const app = express();

// Middleware
app.use(bodyParser.json()); // Ensures JSON parsing
app.use(bodyParser.urlencoded({ extended: true })); // Handles URL-encoded data
app.use(cors());

// Debugging: Check if JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not set in .env file!");
  process.exit(1); // Stop server if secret is missing
}

// Default route
app.get("/", (req, res) => res.send("Military Leave System API Running"));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/leave", require("./routes/leave"));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
