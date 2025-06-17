const express = require("express");
const admin = require("firebase-admin");
const rateLimit = require("express-rate-limit");
const { validateRegistration } = require("../middleware/validation");
const securityMiddleware = require("../middleware/security");

const router = express.Router();

// Apply global security middleware
securityMiddleware(router);

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
  const serviceAccount = require("../config/firebase-service-account.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// Rate limit registration/login to prevent abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many requests. Try again later." },
});

const verifyToken = async (req, res, next) => {
  console.log("🔍 === TOKEN VERIFICATION START ===");
  
  try {
    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Invalid auth header format");
      return res.status(401).json({ 
        success: false,
        error: "Authentication required", 
        details: "No valid Bearer token provided",
        solution: "Include 'Authorization: Bearer <token>' header"
      });
    }

    // 2. Extract token
    const token = authHeader.split(" ")[1];
    
    // 3. Verify token with Firebase
    const decoded = await admin.auth().verifyIdToken(token, true);
    
    // 4. Check expiration
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      console.log("❌ Token expired");
      return res.status(401).json({
        success: false,
        error: "Token expired",
        details: `Token expired at ${new Date(decoded.exp * 1000)}`,
        solution: "Refresh your token"
      });
    }

    // 5. Set user context
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      decodedToken: decoded
    };
    
    console.log("✅ Token verified successfully for user:", decoded.uid);
    next();
    
  } catch (error) {
    console.error("❌ Token verification failed:", error.code, error.message);
    
    let response = {
      success: false,
      error: 'Authentication failed',
      details: error.message
    };

    if (error.code === 'auth/id-token-revoked') {
      response.solution = 'Please log in again';
    } else if (error.code === 'auth/id-token-expired') {
      response.solution = 'Refresh your token';
    }

    return res.status(401).json(response);
  }
};

// GET: Debug status
router.get("/debug", (req, res) => {
  res.json({ 
    status: "Auth service running", 
    time: new Date().toISOString(),
    firebaseApps: admin.apps.length 
  });
});

// POST: Register new user - FIXED: Changed from app.post to router.post
router.post('/register', verifyToken, async (req, res) => {
  try {
    const { 
      uid, 
      regNumber, 
      soldierId, // Also accept soldierId as alias for regNumber
      email, 
      name,
      firstName, 
      lastName, 
      rank, 
      role,
      unit, 
      phoneNumber, 
      dateOfBirth,
      ...otherData // Include any other data from the frontend
    } = req.body;
    // Check if user is trying to register as admin
    const isAdminRegistration = email.endsWith('@military.gov') || role === 'admin';

    // Use regNumber or soldierId (they should be the same)
    const soldierNumber = regNumber || soldierId;
    
    // Validate required fields
    if (!uid || !soldierNumber || !email || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: uid, regNumber/soldierId, email, name' 
      });
    }

    console.log('Processing registration for soldier:', soldierNumber, 'UID:', uid);

    // Check if user already exists in users collection
    const existingUser = await db.collection('users').doc(uid).get();
    if (existingUser.exists) {
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }

    // Get the existing soldier data from soldiers collection
    const soldierRef = db.collection('soldiers').doc(soldierNumber);
    const soldierDoc = await soldierRef.get();
    
    if (!soldierDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Soldier record not found in system'
      });
    }

    const existingSoldierData = soldierDoc.data();
    
    // Check if soldier is already registered
    if (existingSoldierData.registered) {
      return res.status(409).json({
        success: false,
        error: 'This soldier ID is already registered'
      });
    }

    // Prepare user data for users collection
    const userData = {
      uid,
      regNumber: soldierNumber,
      soldierId: soldierNumber, // Keep both for compatibility
      email,
      name,
      role: isAdminRegistration ? 'admin' : 'soldier',
      firstName: firstName || name.split(' ')[0] || name,
      lastName: lastName || name.split(' ').slice(1).join(' ') || '',
      rank: rank || existingSoldierData.rank || 'Private',
      role: role || 'soldier',
      unit: unit || existingSoldierData.unit || '',
      phoneNumber: phoneNumber || existingSoldierData.phoneNumber || '',
      dateOfBirth: dateOfBirth || existingSoldierData.dateOfBirth || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      // Include any existing soldier data
      ...existingSoldierData,
      // Initialize leave entitlements
      leaveEntitlements: {
        annual: { total: 30, used: 0, remaining: 30 },
        sick: { total: 14, used: 0, remaining: 14 },
        compassionate: { total: 7, used: 0, remaining: 7 }
      }
    };
    // Save to Firestore
    await db.collection('users').doc(uid).set(userData);
    // Set admin claims if needed
    if (isAdminRegistration) {
      try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
      } catch (claimsError) {
        console.error('Failed to set admin claims:', claimsError);
        // Continue even if claims fail - we'll fall back to Firestore role
      }
    }

    // Prepare updated soldier data
    const updatedSoldierData = {
      ...existingSoldierData,
      uid,
      email,
      name,
      firstName: firstName || name.split(' ')[0] || name,
      lastName: lastName || name.split(' ').slice(1).join(' ') || '',
      rank: rank || existingSoldierData.rank || 'Private',
      role: role || 'soldier',
      unit: unit || existingSoldierData.unit || '',
      phoneNumber: phoneNumber || existingSoldierData.phoneNumber || '',
      dateOfBirth: dateOfBirth || existingSoldierData.dateOfBirth || '',
      registered: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };

    // Use a batch write to ensure both operations succeed or fail together
    const batch = db.batch();

    // Create user document
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, userData);

    // Update soldier document to mark as registered
    batch.update(soldierRef, updatedSoldierData);

    // Commit the batch
    await batch.commit();

    console.log('Registration successful for soldier:', soldierNumber, 'UID:', uid);
    
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      user: {
        uid,
        regNumber: soldierNumber,
        email,
        name,
        rank: userData.rank,
        role: userData.role,
        unit: userData.unit
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error during registration';
    if (error.code === 'permission-denied') {
      errorMessage = 'Permission denied - check Firestore security rules';
    } else if (error.code === 'not-found') {
      errorMessage = 'Soldier record not found';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to initialize dashboard data
async function initializeDashboardData(uid, soldierId) {
  const batch = db.batch();
  
  // 1. Create leave entitlement
  const entitlementRef = db.collection('leaveEntitlements').doc(uid);
  batch.set(entitlementRef, {
    soldierId,
    annualLeave: 30,
    sickLeave: 15,
    casualLeave: 10,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  // 2. Create empty leave requests collection
  const requestsRef = db.collection('users').doc(uid).collection('leaveRequests').doc();
  batch.set(requestsRef, {
    initialized: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 3. Create user settings
  const settingsRef = db.collection('userSettings').doc(uid);
  batch.set(settingsRef, {
    notificationsEnabled: true,
    theme: 'light',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
}

// POST: Login user
router.post("/login", authLimiter, async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "ID token required" });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userRef = db.collection("users").doc(decoded.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ 
        error: "User not found",
        solution: "Please register first"
      });
    }

    // Update last login
    await userRef.update({ 
      lastLogin: admin.firestore.FieldValue.serverTimestamp() 
    });

    const userData = userSnap.data();

    return res.json({
      success: true,
      message: "Login successful",
      token: idToken,
      user: {
        uid: decoded.uid,
        name: userData.name,
        email: userData.email,
        rank: userData.rank,
        role: userData.role,
        soldierId: userData.soldierId,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(401).json({ 
      success: false,
      error: "Login failed",
      details: error.message 
    });
  }
});

// GET: Verify token and return user info
router.get("/verify", verifyToken, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ 
        success: false,
        error: "User not found",
        solution: "Please register first"
      });
    }

    const userData = userSnap.data();

    return res.json({
      success: true,
      valid: true,
      user: {
        uid: req.user.uid,
        name: userData.name,
        email: userData.email,
        rank: userData.rank,
        role: userData.role,
        soldierId: userData.soldierId,
      },
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Verification failed",
      details: err.message 
    });
  }
});

// GET: Protected route example
router.get("/protected", verifyToken, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    return res.json({ 
      success: true,
      message: "Protected access granted", 
      user: userSnap.data() 
    });
  } catch (error) {
    console.error("Protected route error:", error);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error",
      details: error.message 
    });
  }
});

// POST: Logout
router.post("/logout", verifyToken, (req, res) => {
  res.json({ 
    success: true,
    message: "Logout successful (client should delete token)" 
  });
});
// POST: Set admin claims
router.post('/set-admin', verifyToken, async (req, res) => {
  try {
    // Only allow existing admins to set admin privileges
    if (!req.user.role || (req.user.role !== 'admin' && !req.user.email.endsWith('@military.gov'))) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'Only admins can set admin privileges'
      });
    }

    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: 'User ID (uid) is required'
      });
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { admin: true });

    // Update Firestore user document
    await db.collection('users').doc(uid).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Admin privileges granted successfully'
    });
  } catch (error) {
    console.error('Error setting admin claims:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set admin privileges',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



// GET: Get current user info - FIXED: Changed from app.get to router.get
// Update your /auth/me endpoint
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false,
        exists: false,
        error: 'User profile not found',
        message: 'Please complete registration'
      });
    }

    const userData = userDoc.data();
    
    // Include custom claims if available
    let customClaims = {};
    try {
      const userRecord = await admin.auth().getUser(req.user.uid);
      customClaims = userRecord.customClaims || {};
    } catch (authError) {
      console.error('Error fetching custom claims:', authError);
    }

    return res.json({
      success: true,
      exists: true,
      user: {
        ...userData,
        ...customClaims,
        uid: req.user.uid
      }
    });
    
  } catch (error) {
    console.error('Error in /auth/me:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
module.exports = router;