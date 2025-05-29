import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyClIWzTT9sI-a99FI4NnREFmR8BH_ZqPtU",
  authDomain: "prototype-1-db996.firebaseapp.com",
  projectId: "prototype-1-db996",
  storageBucket: "prototype-1-db996.firebasestorage.app",
  messagingSenderId: "325156329796",
  appId: "1:325156329796:web:60533fa26d8578eca69f11",
  measurementId: "G-4HK1J3Y862"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 