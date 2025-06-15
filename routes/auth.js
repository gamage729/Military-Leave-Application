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

// POST: Register new user
router.post('/register', async (req, res) => {
  try {
    const { soldierId, email, password, name, rank } = req.body;

    // Validate input
    if (!soldierId || !email || !password || !name || !rank) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Check if soldier exists and isn't registered
    const soldierRef = db.collection('soldiers').doc(soldierId);
    const soldierDoc = await soldierRef.get();
    
    if (!soldierDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Soldier not found'
      });
    }

    if (soldierDoc.data().registered) {
      return res.status(400).json({
        success: false,
        error: 'Soldier already registered'
      });
    }

    // 1. First create the Firebase auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    // 2. Create the user document
    const userData = {
      uid: userRecord.uid,
      soldierId,
      name,
      email,
      rank,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      leaveEntitlements: {
        'Annual Leave': 30,
        'Sick Leave': 15,
        'Casual Leave': 10
      }
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // 3. Then mark soldier as registered
    await soldierRef.update({
      registered: true,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      registeredBy: userRecord.uid
    });

    // 4. Initialize dashboard data
    await initializeDashboardData(userRecord.uid, soldierId);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        ...userData,
        password: undefined // Don't return password
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Clean up if user was created but something else failed
    if (error.code === 'auth/email-already-exists') {
      try {
        const user = await admin.auth().getUserByEmail(req.body.email);
        await admin.auth().deleteUser(user.uid);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Registration failed',
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

// GET: Current logged-in user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userSnap = await db.collection("users").doc(req.user.uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }
    
    const userData = userSnap.data();
    return res.json({
      success: true,
      user: {
        uid: req.user.uid,
        name: userData.name,
        email: userData.email,
        rank: userData.rank,
        role: userData.role,
        soldierId: userData.soldierId,
      }
    });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to fetch current user",
      details: err.message 
    });
  }
});

module.exports = router;