const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  // Validate service account
  console.log('Service Account Project ID:', serviceAccount.project_id);
  console.log('Service Account Client Email:', serviceAccount.client_email);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Add the database URL - this is important for proper initialization
      databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com/`
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    
    // Test the connection immediately
    const testConnection = async () => {
      try {
        const db = admin.firestore();
        await db.collection('_test').doc('connection').set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'connected'
        });
        console.log('✅ Firestore connection verified');
        
        // Clean up test document
        await db.collection('_test').doc('connection').delete();
      } catch (error) {
        console.error('❌ Firestore connection test failed:', error.message);
        console.error('Error code:', error.code);
      }
    };
    
    // Run connection test
    testConnection();
    
  } else {
    console.log('ℹ️ Firebase Admin already initialized');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.error('Full error:', error);
  
  // More specific error handling
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('📁 Please ensure serviceAccountKey.json exists in the same directory as firebase.js');
  } else if (error.message.includes('private_key')) {
    console.log('🔑 There might be an issue with the private key in your service account file');
  }
  
  process.exit(1);
}

// Export the necessary Firebase services
const db = admin.firestore();
const auth = admin.auth();

// Add connection status check
const checkFirebaseStatus = async () => {
  try {
    // Test Firestore
    await db.listCollections();
    console.log('✅ Firestore is ready');
    
    // Test Auth
    await auth.listUsers(1);
    console.log('✅ Firebase Auth is ready');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase services not ready:', error.message);
    return false;
  }
};

module.exports = {
  db,                         // Firestore access
  admin,                      // Full admin access
  auth,                       // Firebase Auth for user management and token verification
  checkFirebaseStatus         // Function to check if Firebase is ready
};