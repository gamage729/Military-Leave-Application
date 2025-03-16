const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const db = require("./config/db");
const { authenticateToken, authorizeRoles } = require("./middleware/auth");
const securityMiddleware = require("./middleware/security");

const app = express();

// Apply security middleware
securityMiddleware(app);

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Ensure required environment variables exist
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error("ERROR: JWT secrets are missing in .env file!");
  process.exit(1);
}

// Default route
app.get("/", (req, res) => res.send("Military Leave System API Running"));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/leave", require("./routes/leave")); // Secure leave routes
app.use("/token", require("./routes/token")); // Refresh token route

// Logging registered routes
console.log("Registered Routes:");
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`Route: ${middleware.route.path}`);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
