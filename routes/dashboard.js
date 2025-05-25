    const express = require('express');
    const db = require('../firebase');
    const { authenticateToken } = require('../middleware/auth');
    const fetch = require('node-fetch');
    const router = require('express').Router();


    // Helper function to get previous leaves for a user
    async function getPreviousLeaves(userId) {
      try {
        const snapshot = await db.collection('leaveRequests')
          .where('userId', '==', userId)
          .get();

        const leaves = [];
        snapshot.forEach(doc => leaves.push({ id: doc.id, ...doc.data() }));

        return leaves;
      } catch (error) {
        console.error('Error fetching previous leaves:', error);
        throw new Error('Failed to fetch previous leaves');
      }
    }

    // Dashboard route - shows user info and previous leaves
    router.get('/dashboard', authenticateToken, async (req, res) => {
      try {
        const userId = req.user.id;  // Assume JWT decoded user id is in req.user.id

        // Get previous leaves from Firestore directly
        const previousLeaves = await getPreviousLeaves(userId);

        // You can also get other dashboard info here if needed

        res.status(200).json({
          success: true,
          data: {
            userId,
            previousLeaves,
            // add other dashboard data here
          },
        });
      } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // ========== GET DASHBOARD DATA ==========
    router.get('/overview/:userId', authenticateToken, async (req, res) => {
      try {
        const { userId } = req.params;

        const leaveRequestsSnapshot = await db.collection('leaveRequests')
          .where('userId', '==', userId)
          .get();

        const leaveRequests = [];
        leaveRequestsSnapshot.forEach(doc => {
          leaveRequests.push({ id: doc.id, ...doc.data() });
        });

        const approved = leaveRequests.filter(req => req.status === 'approved').length;
        const pending = leaveRequests.filter(req => req.status === 'pending').length;
        const rejected = leaveRequests.filter(req => req.status === 'rejected').length;
        const total = leaveRequests.length;

        const leaveDays = leaveRequests
          .filter(req => req.status === 'approved')
          .map(req => ({
            date: new Date(req.startDate),
            endDate: new Date(req.endDate),
            type: req.status,
            leaveType: req.leaveType
          }));

        return res.status(200).json({
          success: true,
          data: {
            overview: { approved, pending, rejected, total },
            leaveDays,
            recentRequests: leaveRequests.slice(-5)
          }
        });
      } catch (error) {
        console.error('Error fetching dashboard overview:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch dashboard data'
        });
      }
    });

    // ========== GET USER LEAVE ENTITLEMENT ==========
    router.get('/entitlement/:userId', authenticateToken, async (req, res) => {
      try {
        const { userId } = req.params;
        console.log(`[DEBUG] Fetching entitlement for user: ${userId}`);

        // 1. Check user exists
        console.log('[DEBUG] Fetching user document...');
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.log(`[DEBUG] User ${userId} not found in Firestore`);
          return res.status(404).json({ success: false, error: 'User not found' });
        }

        console.log('[DEBUG] User found, processing entitlements...');
        const userData = userDoc.data();

        // 2. Calculate date range for current year
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);
        console.log(`[DEBUG] Year range: ${startOfYear.toISOString()} to ${endOfYear.toISOString()}`);

        // 3. Query approved leaves within current year
        console.log('[DEBUG] Querying approved leaves for the year...');
        const usedLeavesSnapshot = await db.collection('leaveRequests')
          .where('userId', '==', userId)
          .where('status', '==', 'approved')
          // Firestore does not allow multiple range filters on different fields.
          // Using startDate filtering only - make sure your data and query make sense
          .where('startDate', '>=', startOfYear.toISOString().split('T')[0])
          .where('startDate', '<=', endOfYear.toISOString().split('T')[0])
          .get();

        console.log(`[DEBUG] Found ${usedLeavesSnapshot.size} approved leave requests`);

        // 4. Calculate total used days per leave type
        const usedDaysByType = {};

        usedLeavesSnapshot.forEach(doc => {
          const leave = doc.data();

          // Parse dates safely
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);

          if (isNaN(start) || isNaN(end)) {
            console.warn(`[WARN] Invalid dates in leaveRequest ${doc.id}`);
            return; // skip this record
          }

          // Calculate days difference, inclusive of both start and end dates
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

          if (!usedDaysByType[leave.leaveType]) {
            usedDaysByType[leave.leaveType] = 0;
          }
          usedDaysByType[leave.leaveType] += diffDays;
        });

        console.log('[DEBUG] Used leave days by type:', usedDaysByType);

        // 5. Define entitlement policy for each leave type (hardcoded example)
        // You should replace this with real data, possibly stored in userData or config
        const leaveEntitlements = [
          { name: 'Annual Leave', total: 30 },
          { name: 'Sick Leave', total: 15 },
          { name: 'Casual Leave', total: 10 }
          // Add other leave types if needed
        ];

        // 6. Calculate remaining leave for each type
        const leaveTypes = leaveEntitlements.map(lt => {
          const used = usedDaysByType[lt.name] || 0;
          const remaining = lt.total - used;
          return {
            name: lt.name,
            total: lt.total,
            used,
            remaining: remaining < 0 ? 0 : remaining
          };
        });

        console.log('[DEBUG] Final leave types entitlement:', leaveTypes);

        // 7. Return the entitlement response
        return res.status(200).json({
          success: true,
          data: {
            userId,
            leaveTypes
          }
        });

      } catch (error) {
        console.error('[ERROR] Detailed error:', error);
        console.error('[ERROR] Stack trace:', error.stack);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch leave entitlement data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });


    // ========== GET PREVIOUS LEAVE REQUESTS ==========

    router.get('/previous-leaves/:userId', authenticateToken, async (req, res) => {
      try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        console.log(`[DEBUG] Fetching previous leaves for user ${userId} page ${page} limit ${limit}`);

        // Add validation for query parameters
        if (isNaN(page) || isNaN(limit) ){
          return res.status(400).json({
            success: false,
            error: 'Invalid pagination parameters'
          });
        }

        // Get total count first
        const leaveRequestsSnapshot = await db.collection('leaveRequests')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();

        console.log(`[DEBUG] Total leave requests found: ${leaveRequestsSnapshot.size}`);

        const allRequests = [];
        leaveRequestsSnapshot.forEach(doc => {
          try {
            const data = doc.data();
            // Validate required fields
            if (!data.startDate || !data.endDate || !data.createdAt) {
              console.warn(`[WARN] Document ${doc.id} missing required fields`);
              return;
            }
            
            allRequests.push({ id: doc.id, ...data });
          } catch (docError) {
            console.error(`[ERROR] Error processing document ${doc.id}:`, docError);
          }
        });

        // Process pagination
        const paginatedRequests = allRequests.slice(offset, offset + parseInt(limit)).map(data => {
          try {
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);

            if (isNaN(startDate) || isNaN(endDate)) {
              console.warn(`[WARN] Invalid dates in leaveRequest ${data.id}`);
              throw new Error('Invalid date format');
            }

            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            return {
              id: data.id,
              type: data.leaveType,
              start: data.startDate,
              end: data.endDate,
              days,
              status: data.status,
              reason: data.reason,
              createdAt: data.createdAt,
              approvedBy: data.approvedBy,
              rejectionReason: data.rejectionReason
            };
          } catch (mapError) {
            console.error(`[ERROR] Error mapping document ${data.id}:`, mapError);
            return null; // Skip this document but continue processing others
          }
        }).filter(req => req !== null); // Remove any null entries from failed mappings

        return res.status(200).json({
          success: true,
          data: paginatedRequests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: allRequests.length,
            hasMore: allRequests.length > offset + parseInt(limit)
          }
        });
      } catch (error) {
        console.error('[ERROR] Detailed error in previous-leaves endpoint:', error);
        console.error('[ERROR] Error stack:', error.stack);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch previous leave requests',
          details: process.env.NODE_ENV === 'development' ? {
            message: error.message,
            stack: error.stack
          } : undefined
        });
      }
    });

    // ========== SUBMIT LEAVE REQUEST ==========
  // Frontend: Enhanced handleLeaveSubmit function with detailed debugging
  const handleLeaveSubmit = async (formData) => {
    try {
      console.log('=== LEAVE REQUEST SUBMISSION DEBUG ===');
      console.log('Raw form data:', formData);
      
      // Validate required fields before sending
      const requiredFields = ['leaveType', 'startDate', 'endDate', 'reason'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Log date validation
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const today = new Date();
      
      console.log('Date validation:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        today: today.toISOString(),
        startDateValid: !isNaN(startDate),
        endDateValid: !isNaN(endDate),
        startInFuture: startDate >= today.setHours(0, 0, 0, 0),
        endAfterStart: endDate >= startDate
      });

      // Prepare the payload
      const payload = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason
      };

      console.log('Payload being sent:', payload);
      console.log('Payload JSON:', JSON.stringify(payload, null, 2));

      // Make the API call with enhanced error handling
      const response = await apiCall('/dashboard/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Leave request submitted successfully:', response);
      
      // Handle success (add your success logic here)
      return response;

    } catch (error) {
      console.error('=== LEAVE REQUEST ERROR DEBUG ===');
      console.error('Error submitting leave request:', error);
      
      // Try to get more details from the error
      if (error.message.includes('HTTP 400')) {
        console.error('This is a 400 Bad Request error. Common causes:');
        console.error('1. Missing required fields (leaveType, startDate, endDate, reason)');
        console.error('2. Invalid date format');
        console.error('3. Start date in the past');
        console.error('4. End date before start date');
        console.error('5. Overlapping leave requests');
        console.error('6. Insufficient leave balance');
      }
      
      throw error;
    }
  };

  // Backend: Enhanced validation with detailed error messages
  router.post('/apply', authenticateToken, async (req, res) => {
    try {
      console.log('=== LEAVE APPLICATION DEBUG ===');
      console.log('Request body:', req.body);
      console.log('User from token:', req.user);
      
      const { leaveType, startDate, endDate, reason } = req.body;
      const userId = req.user.id;

      // Enhanced field validation with specific error messages
      const missingFields = [];
      if (!leaveType) missingFields.push('leaveType');
      if (!startDate) missingFields.push('startDate');
      if (!endDate) missingFields.push('endDate');
      if (!reason) missingFields.push('reason');

      if (missingFields.length > 0) {
        console.log('Missing fields:', missingFields);
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields
        });
      }

      // Enhanced date validation
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for comparison

      console.log('Date validation:', {
        startDate,
        endDate,
        startParsed: start.toISOString(),
        endParsed: end.toISOString(),
        todayForComparison: today.toISOString(),
        startValid: !isNaN(start),
        endValid: !isNaN(end)
      });

      // Check for invalid dates
      if (isNaN(start) || isNaN(end)) {
        console.log('Invalid date format detected');
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Please use YYYY-MM-DD format',
          details: {
            startDateValid: !isNaN(start),
            endDateValid: !isNaN(end)
          }
        });
      }

      // Check if start date is in the past
      if (start < today) {
        console.log('Start date is in the past');
        return res.status(400).json({
          success: false,
          error: 'Start date cannot be in the past',
          details: {
            startDate: start.toISOString(),
            today: today.toISOString()
          }
        });
      }

      // Check if end date is before start date
      if (end < start) {
        console.log('End date is before start date');
        return res.status(400).json({
          success: false,
          error: 'End date cannot be before start date',
          details: {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          }
        });
      }

      // Check for overlapping requests
      console.log('Checking for overlapping requests...');
      const overlappingSnapshot = await db.collection('leaveRequests')
        .where('userId', '==', userId)
        .where('status', 'in', ['pending', 'approved'])
        .get();

      console.log(`Found ${overlappingSnapshot.size} existing requests to check`);

      let hasOverlap = false;
      let overlappingRequest = null;

      overlappingSnapshot.forEach(doc => {
        const data = doc.data();
        const existingStart = new Date(data.startDate);
        const existingEnd = new Date(data.endDate);

        console.log('Checking overlap with:', {
          existingId: doc.id,
          existingStart: existingStart.toISOString(),
          existingEnd: existingEnd.toISOString(),
          existingStatus: data.status
        });

        if ((start <= existingEnd && end >= existingStart)) {
          hasOverlap = true;
          overlappingRequest = {
            id: doc.id,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status
          };
          console.log('Overlap detected!', overlappingRequest);
        }
      });

      if (hasOverlap) {
        console.log('Rejecting due to overlap');
        return res.status(400).json({
          success: false,
          error: 'You have overlapping leave requests for the selected dates',
          overlappingRequest
        });
      }

      // Calculate leave days
      const leaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      console.log('Calculated leave days:', leaveDays);

      // Check entitlement (with error handling for the internal API call)
      console.log('Checking entitlement...');
      try {
        const entitlementResponse = await fetch(`${req.protocol}://${req.get('host')}/dashboard/entitlement/${userId}`, {
          headers: { 'Authorization': req.headers.authorization }
        });

        if (entitlementResponse.ok) {
          const entitlementData = await entitlementResponse.json();
          const leaveTypeData = entitlementData.data.leaveTypes.find(lt => lt.name === leaveType);

          console.log('Entitlement check:', {
            leaveType,
            leaveTypeData,
            requestedDays: leaveDays
          });

          if (leaveTypeData && leaveTypeData.remaining < leaveDays) {
            console.log('Insufficient leave balance');
            return res.status(400).json({
              success: false,
              error: `Insufficient ${leaveType} leave balance. Available: ${leaveTypeData.remaining}, Requested: ${leaveDays}`,
              entitlementDetails: {
                available: leaveTypeData.remaining,
                requested: leaveDays,
                leaveType
              }
            });
          }
        } else {
          console.warn('Entitlement check failed, proceeding without balance validation');
        }
      } catch (entitlementError) {
        console.warn('Entitlement check error:', entitlementError);
        // Continue without entitlement check if it fails
      }

      // Create the leave request
      const leaveRequest = {
        userId,
        leaveType,
        startDate,
        endDate,
        reason,
        leaveDays,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Creating leave request:', leaveRequest);

      const docRef = await db.collection('leaveRequests').add(leaveRequest);
      console.log('Leave request created with ID:', docRef.id);

      return res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully',
        data: {
          id: docRef.id,
          ...leaveRequest
        }
      });

    } catch (error) {
      console.error('=== LEAVE APPLICATION ERROR ===');
      console.error('Detailed error:', error);
      console.error('Error stack:', error.stack);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to submit leave request',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  });

    // Temporary workaround (remove after index is active)
    router.get('/announcements', authenticateToken, async (req, res) => {
      try {
        const { category } = req.query;
        
        let query = db.collection('announcements')
          .where('isActive', '==', true)
          .orderBy('createdAt', 'desc');

        if (category) {
          query = query.where('category', '==', category);
        }

        const snapshot = await query.get();
        
        const announcements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return res.json({
          success: true,
          data: announcements
        });
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch announcements'
        });
      }
    });
    // Add this test route BEFORE any other routes
    router.get('/test-firebase', async (req, res) => {
      try {
        console.log('Firebase test route hit!'); // Debug log
        
        // Test write operation
        const testRef = db.collection('connection-test').doc('test-doc');
        await testRef.set({
          test: true,
          timestamp: new Date().toISOString()
        });
        
        // Test read operation
        const doc = await testRef.get();
        
        if (!doc.exists) {
          throw new Error('Document not found after writing');
        }

        // Test delete operation (cleanup)
        await testRef.delete();

        return res.json({
          success: true,
          message: 'Firebase connection successful',
          operations: {
            write: true,
            read: true,
            delete: true
          }
        });
      } catch (error) {
        console.error('Firebase test failed:', error);
        return res.status(500).json({
          success: false,
          error: 'Firebase connection test failed',
          details: process.env.NODE_ENV === 'development' ? error.message : null
        });
      }
    });



    module.exports = router;
