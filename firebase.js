const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase only once
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });

  console.log('Firebase Admin initialized successfully');
}

// Initialize Firestore with settings
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Test connections (optional, but helpful)
async function testConnections() {
  try {
    await admin.auth().listUsers(1);
    console.log('✅ Firebase Auth connected');
    
    await db.collection('test').doc('test').get();
    console.log('✅ Firestore connected');
  } catch (error) {
    console.error('Connection test failed:', error);
  }
}

// Run tests (non-blocking)
testConnections();

// Export initialized instances
module.exports = {
  db,  // Firestore instance
  auth: admin.auth(),
  admin,
  storage
};