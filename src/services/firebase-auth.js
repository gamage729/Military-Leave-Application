// src/services/firebase-auth.js
import { auth, db } from '../firebase-config';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const firebaseRegister = async (userData) => {
  try {
    const { email, password, name, rank, role } = userData;
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with display name
    await updateProfile(userCredential.user, { displayName: name });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      email,
      rank,
      role,
      createdAt: new Date().toISOString()
    });

    // Get the ID token
    const accessToken = await userCredential.user.getIdToken();

    return {
      data: {
        user: {
          id: userCredential.user.uid,
          email,
          name,
          rank,
          role
        },
        accessToken,
        refreshToken: userCredential.user.refreshToken
      }
    };
  } catch (error) {
    throw error;
  }
};

export const firebaseLogin = async ({ email, password }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      throw new Error("User data not found");
    }

    const accessToken = await userCredential.user.getIdToken();

    return {
      data: {
        user: {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          ...userDoc.data()
        },
        accessToken,
        refreshToken: userCredential.user.refreshToken
      }
    };
  } catch (error) {
    throw error;
  }
};