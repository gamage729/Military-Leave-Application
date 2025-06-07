const express = require("express");
const admin = require("firebase-admin");
const rateLimit = require("express-rate-limit");
const { validateRegistration } = require("../middleware/validation");
const securityMiddleware = require("../middleware/security");

const router = express.Router();

// Apply global security middleware (helmet, cors, etc.)
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
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  message: { error: "Too many requests. Try again later." },
});

// Middleware: Verify Firebase ID Token - IMPROVED VERSION
const verifyToken = async (req, res, next) => {
  console.log("🔍 === TOKEN VERIFICATION START ===");
  
  try {
    const authHeader = req.headers.authorization;
    console.log("🔍 Auth header exists:", !!authHeader);
    console.log("🔍 Auth header:", authHeader ? authHeader.substring(0, 50) + "..." : "None");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Invalid auth header format");
      return res.status(401).json({ 
        error: "Authentication required", 
        details: "No valid Bearer token provided" 
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔍 Token extracted, length:", token.length);
    console.log("🔍 Token first 50 chars:", token.substring(0, 50));

    console.log("🔍 Attempting Firebase token verification...");
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("✅ Token verified successfully!");
    console.log("🔍 Decoded token keys:", Object.keys(decoded));
    console.log("🔍 UID from token:", decoded.uid);
    console.log("🔍 Email from token:", decoded.email);
    
    // Set req.user
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      decodedToken: decoded
    };
    
    console.log("✅ req.user set:", !!req.user);
    console.log("✅ req.user.uid:", req.user.uid);
    console.log("🔍 === TOKEN VERIFICATION END ===");
    
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    console.error("❌ Error code:", error.code);
    console.error("❌ Full error:", error);
    
    return res.status(401).json({ 
      error: 'Authentication failed', 
      details: error.message 
    });
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

// Simple registration endpoint with extensive debugging
router.post("/register", async (req, res) => {
  console.log("🚀 === REGISTRATION START ===");
  console.log("🔍 Request body:", JSON.stringify(req.body, null, 2));
  console.log("🔍 Request headers:", req.headers);
  
  // Manual token verification for debugging
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid auth header");
      return res.status(401).json({ error: "No auth header" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔍 Token length:", token.length);
    
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("✅ Token verified in route handler");
    console.log("🔍 Decoded UID:", decoded.uid);
    console.log("🔍 Decoded email:", decoded.email);
    
    const { soldierId, name, rank, role, email } = req.body;
    const uid = decoded.uid;
    
    console.log("🔍 Extracted data:");
    console.log("  - UID:", uid);
    console.log("  - Soldier ID:", soldierId);
    console.log("  - Name:", name);
    console.log("  - Email:", email);
    
    // Basic validation
    if (!soldierId || !name || !rank || !role || !email) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if soldier exists (simplified check)
    console.log("🔍 Checking soldier whitelist...");
    const soldierRef = db.collection("soldiers").doc(soldierId);
    const soldierSnap = await soldierRef.get();
    
    if (!soldierSnap.exists) {
      console.log("❌ Soldier not whitelisted:", soldierId);
      return res.status(403).json({ error: "Soldier ID not whitelisted" });
    }
    
    console.log("✅ Soldier found in whitelist");
    
    // Create user data
    const userData = {
      uid,
      soldierId,
      name: name.trim(),
      rank,
      role,
      email: email.toLowerCase().trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
    };
    
    console.log("💾 Creating user:", userData);
    
    // Save to database
    await db.collection("users").doc(uid).set(userData);
    await soldierRef.update({ 
      registered: true, 
      registeredAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    
    console.log("✅ Registration successful!");
    
    res.status(201).json({
      message: "Registration successful",
      user: {
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        rank: userData.rank,
        role: userData.role,
        soldierId: userData.soldierId,
      },
    });
    
  } catch (error) {
    console.error("❌ Registration failed:", error);
    res.status(500).json({ 
      error: "Registration error", 
      details: error.message 
    });
  }
  
  console.log("🔍 === REGISTRATION END ===");
});

// POST: Login user (expects Firebase ID token from client)
router.post("/login", authLimiter, async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "ID token required" });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userRef = db.collection("users").doc(decoded.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found. Please register first." });
    }

    // Update last login
    await userRef.update({ 
      lastLogin: admin.firestore.FieldValue.serverTimestamp() 
    });

    const userData = userSnap.data();

    return res.json({
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
    return res.status(401).json({ error: "Login error", details: error.message });
  }
});

// GET: Verify token and return user info
router.get("/verify", verifyToken, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userSnap.data();

    return res.json({
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
    return res.status(500).json({ error: "Verification failed" });
  }
});

// GET: Protected route (just an example)
router.get("/protected", verifyToken, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ 
      message: "Protected access granted", 
      user: userSnap.data() 
    });
  } catch (error) {
    console.error("Protected route error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST: Logout (Client should delete token)
router.post("/logout", verifyToken, (req, res) => {
  res.json({ message: "Logout successful (client should delete token)" });
});

// GET: Current logged-in user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userSnap = await db.collection("users").doc(req.user.uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const userData = userSnap.data();
    return res.json({
      uid: req.user.uid,
      name: userData.name,
      email: userData.email,
      rank: userData.rank,
      role: userData.role,
      soldierId: userData.soldierId,
    });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ error: "Failed to fetch current user" });
  }
});

module.exports = router;