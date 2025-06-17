const express = require('express');
const { db } = require("./firebase");
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { authenticateToken } = require("./middleware/auth");
const securityMiddleware = require("./middleware/security");
const { leaveGuideHandler } = require('./src/services/leaveGuideService');

// ========== MIDDLEWARE SETUP ==========
app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// CORS CONFIGURATION - Updated for admin panel
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'], // Added 3001 for admin panel
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Add this after CORS setup
app.options('*', cors(corsOptions)); // Handle preflight for all routes

// RATE LIMITING - Added for admin panel security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  }
});
app.use(limiter);

// SECURITY MIDDLEWARE
securityMiddleware(app);

// Clear route cache (development only)
if (process.env.NODE_ENV === 'development') {
  delete require.cache[require.resolve('./routes/auth')];
  delete require.cache[require.resolve('./routes/dashboard')];
  delete require.cache[require.resolve('./routes/leave')];
}

// JWT Secret Check
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  console.error("ERROR: Missing JWT secrets in .env file!");
  process.exit(1);
}

// ========== ROUTES ==========

// Root route
app.get("/", (req, res) => res.send("Military Leave System API Running"));

// Enhanced Health check with service status
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'running',
      leave: 'running',
      dashboard: 'running',
      database: db ? 'connected' : 'disconnected',
      webhook: 'running'
    }
  });
});

// Import and use routes with consistent API prefix structure
app.use('/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth')); // Admin panel compatibility
app.use('/leave', require('./routes/leave'));
app.use('/api/leave', require('./routes/leave')); // Admin panel compatibility
app.use('/token', require('./routes/token'));

const dashboardRoutes = require('./routes/dashboard');
app.use('/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes); // Admin panel compatibility

// News Routes
const newsRoutes = require('./routes/news');
app.use('/api', newsRoutes);
app.use('/api/news', newsRoutes); // Additional endpoint for admin panel

// ========== SMART DIALOGFLOW WEBHOOK ==========
app.post('/webhook/dialogflow', async (req, res) => {
  console.log("Incoming Dialogflow Webhook:", JSON.stringify(req.body, null, 2));

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

    console.log("Detected user input for leave guidance:", userInput);

    const responseText = await leaveGuideHandler(userInput);

    return res.json({ fulfillmentText: responseText });

  } catch (err) {
    console.error("Error processing Dialogflow webhook:", err);
    return res.status(500).json({ error: "Internal server error while processing the webhook." });
  }
});

// Simple frontend webhook test
app.post('/webhook', (req, res) => {
  console.log("Frontend Webhook Triggered:", req.body);
  res.json({ success: true, message: 'Webhook is working!' });
});

// ========== ADMIN PANEL SPECIFIC ENDPOINTS ==========

// Admin Dashboard Statistics
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    const stats = {
      totalUsers: 0,
      totalLeaveRequests: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0
    };

    if (db) {
      // Get user count
      const usersSnapshot = await db.collection('users').get();
      stats.totalUsers = usersSnapshot.size;

      // Get leave requests stats
      const leaveRequestsSnapshot = await db.collection('leaveRequests').get();
      stats.totalLeaveRequests = leaveRequestsSnapshot.size;

      leaveRequestsSnapshot.forEach(doc => {
        const request = doc.data();
        switch (request.status) {
          case 'pending':
            stats.pendingRequests++;
            break;
          case 'approved':
            stats.approvedRequests++;
            break;
          case 'rejected':
            stats.rejectedRequests++;
            break;
        }
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin Users Management
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== LEGACY BALANCES ENDPOINT (DEPRECATED - USE /dashboard/entitlement/:userId) ==========
app.get('/balances/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // Redirect to new dashboard endpoint
    return res.redirect(`/dashboard/entitlement/${userId}`);
  } catch (error) {
    console.error('Error fetching balances:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// ========== SEED DATA ENDPOINT (DEVELOPMENT ONLY) ==========
if (process.env.NODE_ENV === 'development') {
  app.post('/seed-data', async (req, res) => {
    try {
      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      
      // Sample announcements
      const announcements = [
        {
          title: "System Maintenance",
          message: "The leave management system will be unavailable on Sunday, April 27th from 02:00-04:00 for scheduled maintenance.",
          type: "info",
          category: "system",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          title: "New Leave Policy Update",
          message: "Effective May 1st, all emergency leave requests require supporting documentation within 48 hours of submission.",
          type: "urgent",
          category: "admin",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          title: "Training Leave Applications",
          message: "All personnel are reminded that training leave applications must be submitted at least 14 days in advance.",
          type: "standard",
          category: "admin",
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];

      // Add announcements to database
      for (const announcement of announcements) {
        await db.collection('announcements').add(announcement);
      }

      // Sample admin user
      const adminUser = {
        name: "Admin User",
        email: "admin@military.gov",
        rank: "Colonel",
        role: "admin",
        leaveEntitlements: {
          Annual: 25,
          Medical: 15,
          Emergency: 10,
          Casual: 12,
          Training: 20,
          Travel: 15
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.collection('users').doc('admin-user-id').set(adminUser);

      // Sample user with leave entitlements
      const sampleUser = {
        name: "John Doe",
        email: "john.doe@military.gov",
        rank: "Sergeant",
        role: "soldier",
        leaveEntitlements: {
          Annual: 20,
          Medical: 10,
          Emergency: 5,
          Casual: 10,
          Training: 15,
          Travel: 10
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.collection('users').doc('sample-user-id').set(sampleUser);

      // Sample leave requests
      const sampleLeaveRequests = [
        {
          userId: 'sample-user-id',
          leaveType: 'Annual',
          startDate: '2024-03-15',
          endDate: '2024-03-22',
          reason: 'Family vacation',
          leaveDays: 8,
          status: 'approved',
          approvedBy: 'admin@military.gov',
          createdAt: new Date('2024-03-01').toISOString(),
          updatedAt: new Date('2024-03-02').toISOString()
        },
        {
          userId: 'sample-user-id',
          leaveType: 'Medical',
          startDate: '2024-04-10',
          endDate: '2024-04-12',
          reason: 'Medical treatment',
          leaveDays: 3,
          status: 'approved',
          approvedBy: 'admin@military.gov',
          createdAt: new Date('2024-04-05').toISOString(),
          updatedAt: new Date('2024-04-06').toISOString()
        },
        {
          userId: 'sample-user-id',
          leaveType: 'Emergency',
          startDate: '2024-05-20',
          endDate: '2024-05-21',
          reason: 'Family emergency',
          leaveDays: 2,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      for (const leaveRequest of sampleLeaveRequests) {
        await db.collection('leaveRequests').add(leaveRequest);
      }

      res.json({ 
        success: true, 
        message: 'Sample data seeded successfully',
        data: {
          announcements: announcements.length,
          users: 2, // admin + sample user
          leaveRequests: sampleLeaveRequests.length
        }
      });

    } catch (error) {
      console.error('Error seeding data:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to seed data',
        details: error.message 
      });
    }
  });
}

// ========== PRINT ALL REGISTERED ROUTES ==========
console.log('\nRegistered Routes:');
function printRoutes(stack, prefix = '') {
  stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`${Object.keys(middleware.route.methods).join(', ').padEnd(8)} ${prefix}${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      const routerPrefix = prefix + (middleware.regexp.source === '^\\/?$' ? '' : middleware.regexp.source
        .replace('^\\', '')
        .replace('(?=\\/|$)', '')
        .replace(/\\\//g, '/')
        .replace(/\/\i/g, ''));
      printRoutes(middleware.handle.stack, routerPrefix);
    }
  });
}
printRoutes(app._router.stack);

// ========== ENHANCED ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========== 404 HANDLER ==========
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: [
      '/health',
      '/auth/*',
      '/api/auth/*',
      '/leave/*',
      '/api/leave/*',
      '/dashboard/*',
      '/api/dashboard/*',
      '/webhook/dialogflow',
      '/api/admin/*'
    ]
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`Health Check:     http://localhost:${PORT}/health`);
  console.log(`Webhook Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Dialogflow Hook:  http://localhost:${PORT}/webhook/dialogflow`);
  console.log(`Dashboard API:    http://localhost:${PORT}/dashboard/*`);
  console.log(`Admin Panel API:  http://localhost:${PORT}/api/admin/*`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`Seed Data:        http://localhost:${PORT}/seed-data (POST)`);
  }
  console.log('\n');
});

module.exports = app;