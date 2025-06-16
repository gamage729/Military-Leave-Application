const express = require('express');
const { db, auth, admin } = require('../firebase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { param, query, body } = require('express-validator');



const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Apply rate limiting to all dashboard routes
router.use(apiLimiter);

// Authentication middleware
router.use(authenticateToken);

// Simplified logging middleware
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Auth Header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('Authenticated User:', req.user?.uid || 'None');
  next();
});








// Helper functions for data fetching
const getOverviewData = async (userId) => {
  const [requestsSnapshot, announcementsSnapshot] = await Promise.all([
    db.collection('leaveRequests')
      .where('userId', '==', userId)
      .get(),
    db.collection('announcements')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get()
  ]);

  const requests = requestsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const announcements = announcementsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    pending: requests.filter(r => r.status === 'pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    leaveDays: requests
      .filter(r => r.status === 'approved' && new Date(r.endDate) >= new Date())
      .map(r => ({
        date: r.startDate,
        endDate: r.endDate,
        type: r.leaveType,
        status: r.status
      })),
    recentRequests: requests.slice(0, 5),
    announcements
  };
};

const getEntitlementData = async (userId) => {
  const [userDoc, usedLeavesSnapshot] = await Promise.all([
    db.collection('users').doc(userId).get(),
    db.collection('leaveRequests')
      .where('userId', '==', userId)
      .where('status', '==', 'approved')
      .get()
  ]);

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  const usedDaysByType = {};

  usedLeavesSnapshot.forEach(doc => {
    const leave = doc.data();
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);

    if (isNaN(start) || isNaN(end)) {
      console.warn(`Invalid dates in leaveRequest ${doc.id}`);
      return;
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    usedDaysByType[leave.leaveType] = (usedDaysByType[leave.leaveType] || 0) + diffDays;
  });

  const leaveEntitlements = userData.leaveEntitlements || {
    'Annual Leave': 30,
    'Sick Leave': 15,
    'Casual Leave': 10
  };

  const leaveTypes = Object.entries(leaveEntitlements).map(([name, total]) => {
    const used = usedDaysByType[name] || 0;
    return {
      name,
      total,
      used,
      remaining: Math.max(0, total - used)
    };
  });

  const totals = leaveTypes.reduce((acc, lt) => ({
    totalLeaves: acc.totalLeaves + lt.total,
    usedLeaves: acc.usedLeaves + lt.used,
    remainingLeaves: acc.remainingLeaves + lt.remaining
  }), { totalLeaves: 0, usedLeaves: 0, remainingLeaves: 0 });

  return {
    userId,
    ...totals,
    leaveTypes
  };
};

const getPreviousLeaves = async (userId, limit = 10) => {
  try {
    console.log(`Fetching leaves for user: ${userId}`); // Debug log
    
    const snapshot = await db.collection('leaveRequests')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    console.log(`Found ${snapshot.size} leave requests`); // Debug log

    if (snapshot.empty) {
      console.log('No leave requests found for user:', userId);
      return [];
    }

    const leaves = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Document ${doc.id} data:`, data); // Debug log

      // Convert Firestore dates to JavaScript dates or strings
      const convertDateField = (field) => {
        if (!data[field]) return null;
        if (data[field] && typeof data[field] === 'object' && 'toDate' in data[field]) {
          return data[field].toDate();
        }
        return data[field];
      };

      return {
        id: doc.id,
        leaveType: data.leaveType || data.type || 'Unknown',
        startDate: convertDateField('startDate'),
        endDate: convertDateField('endDate'),
        leaveDays: data.leaveDays || null,
        status: data.status || 'pending',
        rejectionReason: data.rejectionReason || null,
        createdAt: convertDateField('createdAt'),
        updatedAt: convertDateField('updatedAt')
      };
    });

    console.log('Processed leaves:', leaves); // Debug log
    return leaves;
  } catch (error) {
    console.error('Error in getPreviousLeaves:', error);
    throw error;
  }
};
const getAnnouncements = async () => {
  const snapshot = await db.collection('announcements')
    .where('isActive', '==', true)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * @api {get} /dashboard/batch/:userId Get All Dashboard Data (NEW BATCH ENDPOINT)
 */
router.get(
  '/batch/:userId',
  [
    param('userId').isString().notEmpty().withMessage('Invalid user ID')
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const startTime = Date.now();

      // Strict authorization check
      if (userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          details: 'You can only access your own data'
        });
      }

      console.log(`[${new Date().toISOString()}] Fetching batch dashboard data for user:`, userId);

      // Execute all data fetching in parallel using Promise.allSettled
      const [overviewResult, entitlementResult, previousLeavesResult, announcementsResult] = 
        await Promise.allSettled([
          getOverviewData(userId),
          getEntitlementData(userId),
          getPreviousLeaves(userId, 5),
          getAnnouncements()
        ]);

      // Prepare response with error handling
      const response = {
        success: true,
        data: {
          overview: overviewResult.status === 'fulfilled' ? overviewResult.value : null,
          entitlement: entitlementResult.status === 'fulfilled' ? entitlementResult.value : null,
          previousLeaves: previousLeavesResult.status === 'fulfilled' ? previousLeavesResult.value : [],
          announcements: announcementsResult.status === 'fulfilled' ? announcementsResult.value : []
        },
        errors: {
          overview: overviewResult.status === 'rejected' ? overviewResult.reason.message : null,
          entitlement: entitlementResult.status === 'rejected' ? entitlementResult.reason.message : null,
          previousLeaves: previousLeavesResult.status === 'rejected' ? previousLeavesResult.reason.message : null,
          announcements: announcementsResult.status === 'rejected' ? announcementsResult.reason.message : null
        },
        meta: {
          fetchTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };

      console.log(`[${new Date().toISOString()}] Batch fetch completed for user: ${userId} (${Date.now() - startTime}ms)`);
      
      return res.json(response);

    } catch (error) {
      console.error('Batch dashboard data error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @api {get} /dashboard/overview/:userId Get Dashboard Overview
 */
router.get(
  '/overview/:userId',
  [
    param('userId').isString().notEmpty().withMessage('Invalid user ID')
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          details: 'You can only access your own data'
        });
      }

      const data = await getOverviewData(userId);

      return res.json({
        success: true,
        data
      });

    } catch (error) {
      console.error('Dashboard overview error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to load dashboard overview'
      });
    }
  }
);

/**
 * @api {get} /dashboard/entitlement/:userId Get Leave Entitlement
 */
router.get(
  '/entitlement/:userId',
  [
    param('userId').isString().notEmpty().withMessage('Invalid user ID')
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - You can only access your own data'
        });
      }

      const data = await getEntitlementData(userId);

      return res.json({
        success: true,
        data
      });

    } catch (error) {
      console.error('Error fetching leave entitlement:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch leave entitlement data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @api {get} /dashboard/previous-leaves/:userId Get Previous Leaves
 */
router.get(
  '/previous-leaves/:userId',
  [
    param('userId').isString().notEmpty().withMessage('Invalid user ID'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      console.log(`[DEBUG] Fetching leaves for user ${userId}`); // Debug log

      if (userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - You can only access your own data'
        });
      }

      const data = await getPreviousLeaves(userId, limit);
      
      console.log('[DEBUG] Retrieved leaves data:', JSON.stringify(data, null, 2)); // Debug log

      return res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: data.length,
          hasMore: data.length === limit
        }
      });

    } catch (error) {
      console.error('Error fetching previous leaves:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch previous leave requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @api {get} /dashboard/announcements Get Announcements
 */
router.get('/announcements', async (req, res) => {
  try {
    const data = await getAnnouncements();

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch announcements'
    });
  }
});

/**
 * @api {post} /dashboard/apply Submit Leave Request
 */
router.post('/apply', upload.array('attachments'), async (req, res) => {
  try {
    console.log('=== BACKEND DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    const userId = req.user.uid;
    const { leaveType, startDate, endDate, reason } = req.body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          leaveType: !leaveType ? 'Required' : 'OK',
          startDate: !startDate ? 'Required' : 'OK',
          endDate: !endDate ? 'Required' : 'OK',
          reason: !reason ? 'Required' : 'OK'
        }
      });
    }

    // Enhanced date validation
    const validateAndFormatDate = (dateString, fieldName) => {
      // Check if it's already in YYYY-MM-DD format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (isoDateRegex.test(dateString)) {
        return dateString;
      }

      // Try to parse and format the date
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid ${fieldName}: ${dateString}`);
        }
        
        // Format to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      } catch (error) {
        throw new Error(`Invalid ${fieldName} format: ${dateString}`);
      }
    };

    let formattedStartDate, formattedEndDate;
    
    try {
      formattedStartDate = validateAndFormatDate(startDate, 'start date');
      formattedEndDate = validateAndFormatDate(endDate, 'end date');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Validate date range
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');

    if (formattedStartDate < todayString) {
      return res.status(400).json({
        success: false,
        error: 'Start date cannot be in the past'
      });
    }

    if (formattedEndDate < formattedStartDate) {
      return res.status(400).json({
        success: false,
        error: 'End date cannot be before start date'
      });
    }

    // Calculate leave days
    const start = new Date(formattedStartDate + 'T12:00:00');
    const end = new Date(formattedEndDate + 'T12:00:00');
    const leaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = {
      userId,
      leaveType,
      startDate: formattedStartDate, // Store in consistent format
      endDate: formattedEndDate,     // Store in consistent format
      reason,
      leaveDays,
      status: 'pending',
      attachments: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      })) : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log('Creating leave request:', leaveRequest);

    const docRef = await db.collection('leaveRequests').add(leaveRequest);

    // Return the created request with formatted data
    const responseData = {
      id: docRef.id,
      ...leaveRequest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formattedStartDate: start.toLocaleDateString(),
      formattedEndDate: end.toLocaleDateString()
    };

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error submitting leave request:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit leave request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @api {get} /dashboard/health Health Check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard service is healthy',
    timestamp: new Date().toISOString(),
    dbStatus: 'Connected'
  });
});

module.exports = router;