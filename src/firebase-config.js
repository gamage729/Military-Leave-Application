// src/firebase-config.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQZnKv0uOOba83dI0zmhmRvJs5LUfH5K0",
  authDomain: "militaryleavesystem.firebaseapp.com",
  projectId: "militaryleavesystem",
  storageBucket: "militaryleavesystem.firebasestorage.app",
  messagingSenderId: "920276394215",
  appId: "1:920276394215:web:791a00e2b4caa2478d4242",
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Use existing app if already initialized
}

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
