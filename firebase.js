const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase only once
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });

  // Enable Firestore debugging
  admin.firestore().settings({
    ignoreUndefinedProperties: true
  });
  
  console.log('Firebase Admin initialized successfully');
}

// Test connections
async function testConnections() {
  try {
    await admin.auth().listUsers(1);
    console.log('✅ Firebase Auth connected');
    
    await admin.firestore().collection('test').doc('test').get();
    console.log('✅ Firestore connected');
  } catch (error) {
    console.error('Connection test failed:', error);
  }
}

testConnections();

module.exports = {
  db: admin.firestore(),
  auth: admin.auth(),
  admin: admin
};