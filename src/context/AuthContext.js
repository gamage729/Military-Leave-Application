import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { createUserWithEmailAndPassword,onAuthStateChanged, signOut } from "firebase/auth";
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationIncomplete, setRegistrationIncomplete] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  const register = async (email, password, userData) => {
    try {
      // First create the Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
  
      // Get the Firebase token
      const token = await firebaseUser.getIdToken();
  
      // Then register the user in your backend
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...userData,
        uid: firebaseUser.uid,
        email: firebaseUser.email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (response.data.success) {
        // Update the user profile in context
        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          setUser(prev => ({
            ...prev,
            ...profile,
            emailVerified: firebaseUser.emailVerified,
            getIdToken: async (forceRefresh = false) => {
              return await firebaseUser.getIdToken(forceRefresh);
            }
          }));
        }
        return response.data;
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Re-throw the error to handle it in the component
    }
  };

  // Fetch complete user profile from backend
  const fetchUserProfile = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken(true);
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      });
      
      if (response.data.success) {
        if (response.data.exists) {
          // User fully registered
          setUserProfile(response.data.user);
          setRegistrationIncomplete(false);
          return response.data.user;
        } else {
          // User exists in Firebase but not in backend
          console.log('Registration incomplete for user:', firebaseUser.uid);
          setUserProfile({ 
            incomplete: true, 
            uid: firebaseUser.uid, 
            email: firebaseUser.email 
          });
          setRegistrationIncomplete(true);
          return null;
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      
      // Handle different error scenarios
      if (error.response?.status === 404) {
        // User not found in backend
        setRegistrationIncomplete(true);
        setUserProfile({ 
          incomplete: true, 
          uid: firebaseUser.uid, 
          email: firebaseUser.email 
        });
      } else {
        // Other errors
        setUserProfile(null);
        setRegistrationIncomplete(false);
      }
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(true);
          
          // Set basic Firebase user first
          const basicUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            token,
            emailVerified: firebaseUser.emailVerified,
            getIdToken: async (forceRefresh = false) => {
              return await firebaseUser.getIdToken(forceRefresh);
            }
          };
          setUser(basicUser);

          // Then fetch complete profile
          const profile = await fetchUserProfile(firebaseUser);
          
          // Merge Firebase user with profile data if profile exists
          if (profile && !profile.incomplete) {
            setUser(prev => ({
              ...prev,
              ...profile, // This includes firstName, lastName, rank, regNumber, etc.
              // Keep Firebase-specific properties
              emailVerified: firebaseUser.emailVerified,
              getIdToken: async (forceRefresh = false) => {
                return await firebaseUser.getIdToken(forceRefresh);
              }
            }));
          }
          
        } catch (error) {
          console.error('Auth state change error:', error);
          setUser(null);
          setUserProfile(null);
          setRegistrationIncomplete(false);
        }
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        setRegistrationIncomplete(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setRegistrationIncomplete(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Refresh user profile (useful after profile updates)
  const refreshProfile = async () => {
    if (user) {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser);
        
        // Update user object with new profile data
        if (profile && !profile.incomplete) {
          setUser(prev => ({
            ...prev,
            ...profile,
            // Preserve Firebase-specific methods
            getIdToken: prev.getIdToken
          }));
        }
      }
    }
  };

  // Helper function to check if user is fully registered
  const isUserFullyRegistered = () => {
    return user && userProfile && !registrationIncomplete && !userProfile.incomplete;
  };

  // Helper function to get user display name
  const getUserDisplayName = () => {
    if (user && user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'User';
  };

  // Helper function to check if user needs to complete registration
  const needsRegistration = () => {
    return user && (registrationIncomplete || userProfile?.incomplete);
  };

  const contextValue = {
    user,
    userProfile,
    loading,
    registrationIncomplete,
    register, 
    logout,
    refreshProfile,
    isUserFullyRegistered,
    getUserDisplayName,
    needsRegistration,
    // Additional utility functions
    isAuthenticated: !!user,
    isLoading: loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
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