// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationIncomplete, setRegistrationIncomplete] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  const fetchUserProfile = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken(true);
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      });
      
      if (response.data?.user) {
        console.log('✅ User profile loaded successfully');
        setUserProfile(response.data.user);
        setRegistrationIncomplete(false);
        return response.data.user;
      }
      
      // If no user data returned, mark as incomplete
      console.log('⚠️ User profile incomplete - directing to registration');
      setUserProfile({ incomplete: true, uid: firebaseUser.uid, email: firebaseUser.email });
      setRegistrationIncomplete(true);
      return null;
      
    } catch (error) {
      if (error.response?.status === 404) {
        // User not found in backend - needs to complete registration
        console.log('ℹ️ User not found in backend - registration required');
        setUserProfile({ incomplete: true, uid: firebaseUser.uid, email: firebaseUser.email });
        setRegistrationIncomplete(true);
      } else {
        console.error('❌ Unexpected profile fetch error:', error);
        setUserProfile(null);
        setRegistrationIncomplete(false);
      }
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserProfile(userCredential.user);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, userData) => {
    try {
      setLoading(true);
      // 1. Firebase registration
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Update Firebase profile
      if (userData.name) {
        await updateProfile(userCredential.user, {
          displayName: userData.name
        });
      }

      // 3. Backend registration
      const token = await userCredential.user.getIdToken();
      await axios.post(`${API_BASE_URL}/auth/register`, {
        ...userData,
        uid: userCredential.user.uid,
        email: email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 4. Refresh data
      const profile = await fetchUserProfile(userCredential.user);
      
      return {
        user: userCredential.user,
        profile
      };
    } catch (error) {
      console.error('Registration error:', error);
      // Cleanup if Firebase user was created but backend failed
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (deleteError) {
          console.error("Cleanup error:", deleteError);
        }
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setRegistrationIncomplete(false);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      return await fetchUserProfile(auth.currentUser);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken(true);
          const basicUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            token,
            emailVerified: firebaseUser.emailVerified,
            getIdToken: firebaseUser.getIdToken.bind(firebaseUser)
          };
          setUser(basicUser);
          
          const profile = await fetchUserProfile(firebaseUser);
          if (profile) {
            setUser(prev => ({
              ...prev,
              ...profile,
              emailVerified: firebaseUser.emailVerified,
              getIdToken: prev.getIdToken
            }));
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setRegistrationIncomplete(false);
        }
      } catch (error) {
        console.error("Auth state error:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const contextValue = {
    user,
    userProfile,
    loading,
    registrationIncomplete,
    registrationComplete: !registrationIncomplete,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false,
    login,
    register,
    logout,
    refreshProfile,
    needsRegistration: () => user && (!userProfile || registrationIncomplete),
    getUserDisplayName: () => {
      if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
      if (user?.name) return user.name;
      return user?.email || 'User';
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};