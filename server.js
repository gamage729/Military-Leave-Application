const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { authenticateToken, authorizeRoles } = require("./middleware/auth");
const securityMiddleware = require("./middleware/security");
const { leaveGuideHandler } = require('./src/services/leaveGuideService');

// ========== MIDDLEWARE SETUP ==========
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



console.log("JWT Secret:", process.env.JWT_SECRET);

if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: Missing JWT secrets in .env file!");
  process.exit(1);
}


// CORS CONFIGURATION
const corsOptions = {
  origin: ['http://localhost:3000'],  // React frontend
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
};
app.use(cors(corsOptions));

// SECURITY MIDDLEWARE
securityMiddleware(app);

// JWT Secret Check
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error("❌ ERROR: Missing JWT secrets in .env file!");
  process.exit(1);
}

// ========== ROUTES ==========

// Root route
app.get("/", (req, res) => res.send("✅ Military Leave System API Running"));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Auth / Leave / Token Routes
app.use("/auth", require("./routes/auth"));
app.use("/leave", require("./routes/leave"));
app.use("/token", require("./routes/token"));

// News Routes
const newsRoutes = require('./routes/news');
app.use('/api', newsRoutes);

// ========== ✅ SMART DIALOGFLOW WEBHOOK ==========
app.post('/webhook/dialogflow', async (req, res) => {
  console.log("📡 Incoming Dialogflow Webhook:", JSON.stringify(req.body, null, 2));

  try {
    const queryResult = req.body.queryResult;

    if (!queryResult) {
      return res.status(400).json({ error: 'Missing queryResult in request' });
    }

    // Use either raw queryText or fallback to intent name
    const userInput = queryResult.queryText || queryResult.intent?.displayName;

    if (!userInput) {
      return res.status(400).json({ error: 'Invalid request: no recognizable user input' });
    }

    console.log("🔍 Detected user input for leave guidance:", userInput);

    const responseText = await leaveGuideHandler(userInput);

    return res.json({ fulfillmentText: responseText });

  } catch (err) {
    console.error("❌ Error processing Dialogflow webhook:", err);
    return res.status(500).json({ error: "Internal server error while processing the webhook." });
  }
});


app.post('/webhook', (req, res) => {
  console.log("✅ Frontend Webhook Triggered:", req.body);
  res.json({ success: true, message: 'Webhook is working!' });
});

// ========== 📊 GET LEAVE BALANCES ==========
app.get('/balances/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Dummy data (replace with DB logic)
    const balances = {
      annualLeave: 10,
      sickLeave: 5,
      casualLeave: 7
    };

    return res.status(200).json({
      success: true,
      balances
    });
  } catch (error) {
    console.error('❌ Error fetching balances:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// ========== LOG REGISTERED ROUTES ==========
console.log("📌 Registered Routes:");
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`Route: ${middleware.route.path}`);
  }
});

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`✅ Health Check:     http://localhost:${PORT}/health`);
  console.log(`✅ Webhook Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`✅ Dialogflow Hook:  http://localhost:${PORT}/webhook/dialogflow\n`);
});
