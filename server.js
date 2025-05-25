    const express = require('express');
    const app = express();
    const bodyParser = require('body-parser');
    const cors = require('cors');
    require('dotenv').config();
    const db = require("./firebase");
    const { authenticateToken, authorizeRoles } = require("./middleware/auth");
    const securityMiddleware = require("./middleware/security");
    const { leaveGuideHandler } = require('./src/services/leaveGuideService');



    // ========== MIDDLEWARE SETUP ==========
    app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

    // CORS CONFIGURATION
    const corsOptions = {
      origin: 'http://localhost:3000', // React frontend
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    };
    app.use(cors(corsOptions));

    // SECURITY MIDDLEWARE
    securityMiddleware(app);

    // Clear route cache (development only)
  if (process.env.NODE_ENV === 'development') {
    delete require.cache[require.resolve('./routes/auth')];
    delete require.cache[require.resolve('./routes/dashboard')];
  }
    // JWT Secret Check
    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      console.error(" ERROR: Missing JWT secrets in .env file!");
      process.exit(1);
    }

    // ========== ROUTES ==========

    // Root route
    app.get("/", (req, res) => res.send(" Military Leave System API Running"));

    // Health check
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', message: 'Server is running' });
    });
    //new
    app.use('/auth', require('./routes/auth'));
  app.use('/leave', require('./routes/leave'));
  app.use('/token', require('./routes/token'));
  app.use('/dashboard', require('./routes/dashboard'));

    // News Routes
    const newsRoutes = require('./routes/news');
    app.use('/api', newsRoutes);

    // ========== SMART DIALOGFLOW WEBHOOK ==========
    app.post('/webhook/dialogflow', async (req, res) => {
      console.log(" Incoming Dialogflow Webhook:", JSON.stringify(req.body, null, 2));

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

        console.log(" Detected user input for leave guidance:", userInput);

        const responseText = await leaveGuideHandler(userInput);

        return res.json({ fulfillmentText: responseText });

      } catch (err) {
        console.error(" Error processing Dialogflow webhook:", err);
        return res.status(500).json({ error: "Internal server error while processing the webhook." });
      }
    });

    app.post('/webhook', (req, res) => {
      console.log(" Frontend Webhook Triggered:", req.body);
      res.json({ success: true, message: 'Webhook is working!' });
    });

    // ========== LEGACY BALANCES ENDPOINT (DEPRECATED - USE /dashboard/entitlement/:userId) ==========
    app.get('/balances/:userId', authenticateToken, async (req, res) => {
      try {
        const { userId } = req.params;

        // Redirect to new dashboard endpoint
        return res.redirect(`/dashboard/entitlement/${userId}`);
      } catch (error) {
        console.error(' Error fetching balances:', error);
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
              users: 1,
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
    // Print all registered routes
  console.log('\nRegistered Routes:');
  function printRoutes(stack, prefix = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        console.log(`${Object.keys(middleware.route.methods).join(', ').padEnd(8)} ${prefix}${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        printRoutes(middleware.handle.stack, prefix + middleware.regexp.source.replace('^\\', '').replace('(?=\\/|$)', ''));
      }
    });
  }
  printRoutes(app._router.stack);

  // ========== LOG REGISTERED ROUTES ==========
  console.log("\nAll Registered Routes:");
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

    // ========== GLOBAL ERROR HANDLER ==========
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: "Internal Server Error" });
    });

    // ========== START SERVER ==========
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`\n Server running on port ${PORT}`);
      console.log(`Health Check:     http://localhost:${PORT}/health`);
      console.log(` Webhook Endpoint: http://localhost:${PORT}/webhook`);
      console.log(`Dialogflow Hook:  http://localhost:${PORT}/webhook/dialogflow`);
      console.log(`Dashboard API:    http://localhost:${PORT}/dashboard/*`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`Seed Data:        http://localhost:${PORT}/seed-data (POST)`);
      }
      console.log(`\n`);
    });