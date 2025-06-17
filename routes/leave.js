const express = require("express");
const { db } = require("../firebase"); // Fixed import - use destructured import
const { authenticateToken } = require("../middleware/auth");
const { handleLeaveRequest } = require("../src/controllers/leaveController");
const getAIResponse = require('../src/services/deepseek');
const admin = require("firebase-admin");

const router = express.Router();
const conversationHistory = []; // Store conversation context

// Remove duplicate db declaration - use the imported one from firebase.js

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    console.log('Checking admin privileges for user:', req.user);
    
    // Check if user has admin role or officer role
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'officer')) {
      console.log('Access denied - User role:', req.user?.role);
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        details: 'Admin or officer privileges required',
        userRole: req.user?.role || 'none'
      });
    }
    
    console.log('Admin check passed for user:', req.user.email);
    next();
  } catch (error) {
    console.error('Authorization check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      details: error.message
    });
  }
};

// Enhanced error handler
const handleAsyncError = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET: Fetch all leave requests for admin
router.get('/admin/requests', authenticateToken, requireAdmin, handleAsyncError(async (req, res) => {
  console.log('Fetching all leave requests for admin...');
  
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  const requestsSnapshot = await db.collection('leaveRequests').get();
  const requests = [];
  
  for (const doc of requestsSnapshot.docs) {
    const requestData = doc.data();
    
    // Get user information
    let userInfo = {
      soldierName: 'Unknown Soldier',
      rank: 'Unknown',
      unit: 'Unknown Unit',
      email: 'Unknown',
      phone: 'Unknown',
      soldierId: 'Unknown'
    };
    
    if (requestData.userId) {
      try {
        const userDoc = await db.collection('users').doc(requestData.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userInfo = {
            soldierName: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown Soldier',
            rank: userData.rank || 'Private',
            unit: userData.unit || 'Unknown Unit',
            email: userData.email || 'Unknown',
            phone: userData.phoneNumber || userData.phone || 'Unknown',
            soldierId: userData.soldierId || userData.regNumber || 'Unknown'
          };
        }
      } catch (userError) {
        console.error(`Error fetching user ${requestData.userId}:`, userError);
      }
    }
    
    // Handle Firestore timestamps properly
    const createdAt = requestData.createdAt?.toDate ? 
      requestData.createdAt.toDate().toISOString() : 
      requestData.createdAt || new Date().toISOString();
      
    const updatedAt = requestData.updatedAt?.toDate ? 
      requestData.updatedAt.toDate().toISOString() : 
      requestData.updatedAt || createdAt;
    
    requests.push({
      id: doc.id,
      ...requestData,
      ...userInfo,
      createdAt,
      updatedAt,
      // Ensure dates are strings
      startDate: requestData.startDate,
      endDate: requestData.endDate
    });
  }
  
  // Sort by creation date (newest first)
  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  console.log(`Successfully fetched ${requests.length} leave requests`);
  
  res.json({
    success: true,
    requests,
    total: requests.length,
    timestamp: new Date().toISOString()
  });
}));

// PUT: Approve a leave request
router.put('/admin/approve/:requestId', authenticateToken, requireAdmin, handleAsyncError(async (req, res) => {
  const { requestId } = req.params;
  const { comments } = req.body;
  
  console.log(`Approving leave request: ${requestId} by ${req.user.email}`);
  
  if (!requestId) {
    return res.status(400).json({
      success: false,
      error: 'Request ID is required'
    });
  }
  
  // Get the request document
  const requestRef = db.collection('leaveRequests').doc(requestId);
  const requestDoc = await requestRef.get();
  
  if (!requestDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Leave request not found'
    });
  }
  
  const requestData = requestDoc.data();
  
  // Check if already processed
  if (requestData.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `Leave request is already ${requestData.status}`
    });
  }
  
  // Update the request
  const updateData = {
    status: 'approved',
    approvedBy: req.user.uid || req.user.id,
    approverName: req.user.name || req.user.email,
    approverEmail: req.user.email,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvalComments: comments || null
  };
  
  await requestRef.update(updateData);
  
  // Update user's leave entitlements if needed
  if (requestData.userId && requestData.leaveType && requestData.leaveDays) {
    try {
      const userRef = db.collection('users').doc(requestData.userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const entitlements = userData.leaveEntitlements || {};
        
        // Map leave types properly
        const leaveTypeMapping = {
          'Annual': 'annual',
          'Medical': 'medical',
          'Sick': 'sick',
          'Emergency': 'emergency',
          'Compassionate': 'compassionate',
          'Casual': 'casual',
          'Training': 'training',
          'Travel': 'travel'
        };
        
        const leaveTypeKey = leaveTypeMapping[requestData.leaveType] || requestData.leaveType.toLowerCase();
        
        if (entitlements[leaveTypeKey]) {
          // Update entitlements
          if (typeof entitlements[leaveTypeKey] === 'number') {
            // If it's just a number, convert to object
            const totalEntitlement = entitlements[leaveTypeKey];
            entitlements[leaveTypeKey] = {
              total: totalEntitlement,
              used: requestData.leaveDays,
              remaining: totalEntitlement - requestData.leaveDays
            };
          } else if (typeof entitlements[leaveTypeKey] === 'object') {
            // If it's already an object, update it
            entitlements[leaveTypeKey].used = (entitlements[leaveTypeKey].used || 0) + requestData.leaveDays;
            entitlements[leaveTypeKey].remaining = (entitlements[leaveTypeKey].total || 0) - entitlements[leaveTypeKey].used;
          }
          
          await userRef.update({
            leaveEntitlements: entitlements,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    } catch (entitlementError) {
      console.error('Error updating entitlements:', entitlementError);
      // Don't fail the approval, just log the error
    }
  }
  
  console.log(`Leave request ${requestId} approved successfully`);
  
  res.json({
    success: true,
    message: 'Leave request approved successfully',
    requestId,
    approvedBy: req.user.name || req.user.email,
    approvedAt: new Date().toISOString()
  });
}));

// PUT: Reject a leave request
router.put('/admin/reject/:requestId', authenticateToken, requireAdmin, handleAsyncError(async (req, res) => {
  const { requestId } = req.params;
  const { reason, comments } = req.body;
  
  console.log(`Rejecting leave request: ${requestId} by ${req.user.email}`);
  
  if (!requestId) {
    return res.status(400).json({
      success: false,
      error: 'Request ID is required'
    });
  }
  
  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'Rejection reason is required'
    });
  }
  
  // Get the request document
  const requestRef = db.collection('leaveRequests').doc(requestId);
  const requestDoc = await requestRef.get();
  
  if (!requestDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Leave request not found'
    });
  }
  
  const requestData = requestDoc.data();
  
  // Check if already processed
  if (requestData.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `Leave request is already ${requestData.status}`
    });
  }
  
  // Update the request
  const updateData = {
    status: 'rejected',
    rejectedBy: req.user.uid || req.user.id,
    rejectorName: req.user.name || req.user.email,
    rejectorEmail: req.user.email,
    rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    rejectionReason: reason,
    rejectionComments: comments || null
  };
  
  await requestRef.update(updateData);
  
  console.log(`Leave request ${requestId} rejected successfully`);
  
  res.json({
    success: true,
    message: 'Leave request rejected successfully',
    requestId,
    rejectedBy: req.user.name || req.user.email,
    rejectedAt: new Date().toISOString(),
    reason
  });
}));

// GET: Get leave request details
router.get('/admin/request/:requestId', authenticateToken, requireAdmin, handleAsyncError(async (req, res) => {
  const { requestId } = req.params;
  
  if (!requestId) {
    return res.status(400).json({
      success: false,
      error: 'Request ID is required'
    });
  }
  
  const requestDoc = await db.collection('leaveRequests').doc(requestId).get();
  
  if (!requestDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Leave request not found'
    });
  }
  
  const requestData = requestDoc.data();
  
  // Get user information
  let userInfo = {};
  if (requestData.userId) {
    try {
      const userDoc = await db.collection('users').doc(requestData.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userInfo = {
          soldierName: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          rank: userData.rank,
          unit: userData.unit,
          email: userData.email,
          phone: userData.phoneNumber || userData.phone,
          soldierId: userData.soldierId || userData.regNumber
        };
      }
    } catch (userError) {
      console.error('Error fetching user info:', userError);
    }
  }
  
  res.json({
    success: true,
    request: {
      id: requestDoc.id,
      ...requestData,
      ...userInfo,
      createdAt: requestData.createdAt?.toDate?.()?.toISOString() || requestData.createdAt,
      updatedAt: requestData.updatedAt?.toDate?.()?.toISOString() || requestData.updatedAt
    }
  });
}));

// GET: Get dashboard statistics
router.get('/admin/stats', authenticateToken, requireAdmin, handleAsyncError(async (req, res) => {
  console.log('Fetching admin dashboard statistics...');
  
  const requestsSnapshot = await db.collection('leaveRequests').get();
  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    thisMonth: 0,
    thisWeek: 0,
    byType: {},
    recentRequests: []
  };
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const requests = [];
  
  requestsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    stats.total++;
    
    // Count by status
    const status = data.status || 'pending';
    stats[status] = (stats[status] || 0) + 1;
    
    // Count by leave type
    const leaveType = data.leaveType || 'Unknown';
    stats.byType[leaveType] = (stats.byType[leaveType] || 0) + 1;
    
    // Count by time period
    const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt || now);
    if (createdAt >= startOfMonth) stats.thisMonth++;
    if (createdAt >= startOfWeek) stats.thisWeek++;
    
    // Collect for recent requests
    requests.push({
      id: doc.id,
      ...data,
      createdAt: createdAt.toISOString()
    });
  });
  
  // Get 5 most recent requests
  stats.recentRequests = requests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(req => ({
      id: req.id,
      leaveType: req.leaveType,
      status: req.status,
      createdAt: req.createdAt
    }));
  
  console.log('Dashboard stats:', stats);
  
  res.json({
    success: true,
    stats,
    timestamp: new Date().toISOString()
  });
}));

// POST: Submit a new leave request (for regular users)
router.post('/submit', authenticateToken, handleAsyncError(async (req, res) => {
  const {
    leaveType,
    startDate,
    endDate,
    leaveDays,
    reason,
    documents
  } = req.body;
  
  // Validate required fields
  if (!leaveType || !startDate || !endDate || !leaveDays || !reason) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['leaveType', 'startDate', 'endDate', 'leaveDays', 'reason']
    });
  }
  
  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start >= end) {
    return res.status(400).json({
      success: false,
      error: 'End date must be after start date'
    });
  }
  
  // Create leave request
  const leaveRequest = {
    userId: req.user.uid || req.user.id,
    leaveType,
    startDate,
    endDate,
    leaveDays: parseInt(leaveDays),
    reason,
    documents: documents || [],
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // User info for easy access
    submitterName: req.user.name || req.user.email,
    submitterEmail: req.user.email,
    submitterRank: req.user.rank || 'Unknown',
    submitterUnit: req.user.unit || 'Unknown',
    submitterSoldierId: req.user.soldierId || req.user.regNumber || 'Unknown'
  };
  
  const docRef = await db.collection('leaveRequests').add(leaveRequest);
  
  console.log(`Leave request submitted: ${docRef.id} by ${req.user.email}`);
  
  res.status(201).json({
    success: true,
    message: 'Leave request submitted successfully',
    requestId: docRef.id
  });
}));

// GET: Get user's own leave requests
router.get('/my-requests', authenticateToken, handleAsyncError(async (req, res) => {
  const userId = req.user.uid || req.user.id;
  
  const requestsSnapshot = await db.collection('leaveRequests')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  const requests = requestsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
    };
  });
  
  res.json({
    success: true,
    requests,
    total: requests.length
  });
}));

// AI Leave Analysis Route (No authentication required)
router.post("/analyze", handleAsyncError(async (req, res) => {
  const { reason } = req.body;
  
  if (!reason) {
    return res.status(400).json({ 
      success: false,
      error: "Leave reason is required." 
    });
  }

  // Store user message in conversation history
  conversationHistory.push({ role: "user", content: reason });

  // Get AI military-specific response
  const aiResponse = await getAIResponse(reason, conversationHistory);

  // Store AI response for conversation tracking
  conversationHistory.push({ role: "assistant", content: aiResponse });

  res.json({ 
    success: true,
    suggestion: aiResponse 
  });
}));

// Get All Leave Requests (Authenticated users only)
router.get("/all", authenticateToken, handleAsyncError(async (req, res) => {
  const snapshot = await db.collection("leaveRequests").get();
  const leaveRequests = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
  }));
  
  res.json({
    success: true,
    requests: leaveRequests,
    total: leaveRequests.length
  });
}));

// Admin Override Leave Decision
router.put("/override", authenticateToken, handleAsyncError(async (req, res) => {
  const { id, admin_override } = req.body;

  if (!id || !admin_override) {
    return res.status(400).json({ 
      success: false,
      error: "ID and admin override decision are required." 
    });
  }

  const leaveRef = db.collection("leaveRequests").doc(id);
  const doc = await leaveRef.get();

  if (!doc.exists) {
    return res.status(404).json({ 
      success: false,
      error: "Leave request not found." 
    });
  }

  await leaveRef.update({ 
    admin_override,
    status: admin_override,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: req.user.uid || req.user.id,
    updatedByName: req.user.name || req.user.email
  });
  
  res.json({ 
    success: true,
    message: "Leave request override updated.",
    requestId: id,
    newStatus: admin_override
  });
}));

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Leave router error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error in leave routes',
    details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  });
});

module.exports = router;