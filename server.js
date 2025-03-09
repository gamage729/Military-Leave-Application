const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const db = require("./config/db");
const { authenticateToken, authorizeRoles } = require("./middleware/auth");
const securityMiddleware = require("./middleware/security");

const app = express();

// Security & Middleware
securityMiddleware(app); // Apply security features
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Ensure JWT secrets are loaded
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error("ERROR: JWT secrets are missing in .env file!");
  process.exit(1);
}

// Default route
app.get("/", (req, res) => res.send("Military Leave System API Running"));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/leave", authenticateToken, require("./routes/leave")); // Secure leave routes
app.use("/token", require("./routes/token")); // Refresh token route

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
