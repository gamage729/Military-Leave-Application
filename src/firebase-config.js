// src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBQZnKv0uOOba83dI0zmhmRvJs5LUfH5K0",
  authDomain: "militaryleavesystem.firebaseapp.com",
  projectId: "militaryleavesystem",
  storageBucket: "militaryleavesystem.firebasestorage.app",
  messagingSenderId: "920276394215",
  appId: "1:920276394215:web:791a00e2b4caa2478d4242"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };