import axios from "axios";
import { initializeApp } from "firebase/app";
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

const API_URL = "http://localhost:5001";

// Initialize Firebase (for client-side auth only)
const firebaseConfig = {
  apiKey: "AIzaSyBQZnKv0uOOba83dI0zmhmRvJs5LUfH5K0",
  authDomain: "militaryleavesystem.firebaseapp.com",
  projectId: "militaryleavesystem",
  storageBucket: "militaryleavesystem.appspot.com",
  messagingSenderId: "920276394215",
  appId: "1:920276394215:web:791a00e2b4caa2478d4242"
};
  
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// ======================
// Firebase Auth Services (Client-side only)
// ======================
export const firebaseRegister = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      token: await userCredential.user.getIdToken()
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const firebaseLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      token: await userCredential.user.getIdToken()
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const firebaseLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
};

// ======================
// Backend API Calls (Require token)
// ======================
export const registerWithBackend = (userData) => 
  axios.post(`${API_URL}/auth/register`, userData);

export const loginWithBackend = (userData) => 
  axios.post(`${API_URL}/auth/login`, userData);

export const submitLeave = (leaveData, token) =>
  axios.post(`${API_URL}/leave/request`, leaveData, { 
    headers: { Authorization: `Bearer ${token}` } 
  });

export const getLeaveRequests = (token) =>
  axios.get(`${API_URL}/leave/all`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });

export const overrideLeave = (id, decision, token) =>
  axios.put(`${API_URL}/leave/override`, { id, admin_override: decision }, { 
    headers: { Authorization: `Bearer ${token}` } 
  });