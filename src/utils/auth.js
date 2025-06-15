// src/utils/auth.js
import axios from 'axios';
import { auth } from '../firebase-config';
import {
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
let authInitialized = false;

// Helper functions
const getToken = async () => {
  const user = auth.currentUser;
  return user ? await user.getIdToken() : null;
};

const getUser = () => {
  const user = localStorage.getItem('firebaseUser');
  return user ? JSON.parse(user) : null;
};

const clearAuthData = () => {
  localStorage.removeItem('firebaseUser');
  sessionStorage.removeItem('firebaseToken');
};

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        clearAuthData();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Token validation
export const ensureValidToken = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    const token = await user.getIdToken();
    if (!token) throw new Error("No token available");

    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      const refreshedToken = await user.getIdToken(true);
      if (!refreshedToken) throw new Error("Token refresh failed");
      return true;
    }
    
    return true;
  } catch (error) {
    console.error("Token validation failed:", error);
    clearAuthData();
    throw error;
  }
};

// Main auth API
export const authAPI = {
  initialize: () => {
    if (authInitialized) return;
    authInitialized = true;
    return authAPI.isAuthenticated();
  },

  isAuthenticated: async () => {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      await ensureValidToken();
      return true;
    } catch (error) {
      return false;
    }
  },

  getCurrentUser: () => {
    const user = auth.currentUser;
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        ...JSON.parse(localStorage.getItem('firebaseUser') || '{}')
      };
    }
    return null;
  },

  storeAuthData: (userData = {}) => {
    const user = auth.currentUser;
    if (!user) return;

    const userProfile = {
      uid: user.uid,
      email: user.email,
      name: userData.name || user.email.split('@')[0] || 'User',
      rank: userData.rank || '',
      role: userData.role || 'soldier',
      ...userData
    };

    localStorage.setItem('firebaseUser', JSON.stringify(userProfile));
  },

  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const response = await api.post('/auth/login', { email, password });
      
      const userData = response.data?.user || {};
      authAPI.storeAuthData(userData);
      
      return { success: true, user: authAPI.getCurrentUser() };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Login failed' 
      };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await signOut(auth);
      clearAuthData();
    }
  },

  refreshToken: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user to refresh token for");
    return user.getIdToken(true);
  },

  ensureValidToken,
};

export default api;