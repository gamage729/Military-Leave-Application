// utils/auth.js (Frontend) - Updated for Firebase + JWT compatibility
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001'; // Adjust to your backend URL

// Helper to get access token from localStorage (check multiple possible keys)
const getAccessToken = () => {
  return localStorage.getItem('accessToken') || 
         localStorage.getItem('token') || 
         localStorage.getItem('firebaseToken');
};

// Helper to get refresh token from localStorage
const getRefreshToken = () => {
  return localStorage.getItem('refreshToken') || 
         localStorage.getItem('firebaseRefreshToken');
};

// Helper to parse user data safely (check multiple possible keys)
const getUserFromStorage = () => {
  const userStr = localStorage.getItem('user') || 
                  localStorage.getItem('userData') || 
                  localStorage.getItem('firebaseUser');
  
  try {
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    
    // Normalize user object for Firebase/JWT compatibility
    return {
      ...user,
      id: user.id || user.uid,  // Firebase uses uid, JWT might use id
      name: user.name || user.displayName || 'Unknown User',
      email: user.email,
      rank: user.rank || user.customClaims?.rank || '',
      role: user.role || user.customClaims?.role || 'soldier'
    };
  } catch {
    return null;
  }
};

// Check if token is Firebase token
const isFirebaseToken = (token) => {
  return token && token.startsWith('eyJhbGciOiJSUzI1NiIs');
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor: add access token to Authorization header if available
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced token refresh function
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { token: refreshToken });
    const { accessToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    console.log('✅ Access token refreshed successfully');
    return accessToken;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    // Clear tokens on refresh failure
    clearAllTokens();
    throw error;
  }
};

// Helper to clear all possible token storage keys
const clearAllTokens = () => {
  const keysToRemove = [
    'accessToken', 'refreshToken', 'user',
    'token', 'firebaseToken', 'firebaseRefreshToken',
    'userData', 'firebaseUser'
  ];
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

// Response interceptor: handle both 401 and 403 by attempting token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle both 401 (Unauthorized) and 403 (Forbidden) errors
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed: redirect to login
        console.error('Token refresh failed, redirecting to login');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API functions for login, register, logout, etc.
export const authAPI = {
  // Login user and save tokens + user data
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  // Register new user
  register: async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  },

  // Logout user and clear tokens
  logout: async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await axios.post(`${API_BASE_URL}/auth/logout`, { token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAllTokens();
    }
  },

  // Check if user is authenticated (updated for Firebase compatibility)
  isAuthenticated: () => {
    const token = getAccessToken();
    const user = getUserFromStorage();
    
    console.log("🔍 Authentication Check:", {
      hasToken: !!token,
      hasUser: !!user,
      tokenType: token ? (isFirebaseToken(token) ? 'Firebase' : 'JWT') : 'none',
      userId: user?.id,
      userEmail: user?.email
    });
    
    return !!(token && user && user.id && user.email);
  },

  // Get current logged-in user object
  getCurrentUser: () => {
    const user = getUserFromStorage();
    console.log("👤 Getting current user:", user);
    return user;
  },

  // Verify current token with backend
  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  // Force refresh token (useful to call before critical operations)
  refreshToken: async () => {
    try {
      const newToken = await refreshAccessToken();
      return { success: true, token: newToken };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // New method: Store Firebase auth data
  storeFirebaseAuth: (uid, email, token, userData = {}) => {
    const user = {
      id: uid,
      uid: uid,
      email: email,
      name: userData.name || userData.displayName || 'Unknown User',
      rank: userData.rank || '',
      role: userData.role || 'soldier',
      ...userData
    };

    localStorage.setItem('token', token);
    localStorage.setItem('firebaseToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('firebaseUser', JSON.stringify(user));

    console.log('✅ Firebase auth data stored:', {
      uid,
      email,
      tokenStored: !!token,
      userStored: !!user
    });
  },

  // Debug method to check all storage
  debugStorage: () => {
    const allKeys = Object.keys(localStorage).filter(key => 
      key.includes('token') || key.includes('user') || key.includes('auth')
    );
    
    const storageData = {};
    allKeys.forEach(key => {
      const value = localStorage.getItem(key);
      storageData[key] = value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : null;
    });
    
    console.log("🔍 Storage Debug:", storageData);
    return storageData;
  }
};

// Enhanced token validation with automatic refresh
export const ensureValidToken = async () => {
  const token = getAccessToken();

  if (!token) {
    throw new Error("No access token found");
  }

  // Skip JWT validation for Firebase tokens
  if (isFirebaseToken(token)) {
    console.log("🔥 Firebase token detected, skipping JWT validation");
    return true;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
    const now = Math.floor(Date.now() / 1000);

    // Check if token expires in the next 5 minutes (300 seconds)
    if (payload.exp && payload.exp < (now + 300)) {
      console.log("Token expiring soon, refreshing...");
      await refreshAccessToken();
    }

    return true;
  } catch (error) {
    console.error("Token validation failed:", error);
    try {
      await refreshAccessToken();
      return true;
    } catch (refreshError) {
      throw new Error("Failed to refresh invalid token");
    }
  }
};

// Updated validateTokenAndUser function
export const validateTokenAndUser = () => {
  console.log("=== Token Validation ===");
  
  // Check all possible token storage keys
  const token = getAccessToken();
  const user = getUserFromStorage();
  
  console.log("Storage Check:", {
    hasToken: !!token,
    hasUser: !!user,
    tokenType: token ? (isFirebaseToken(token) ? 'Firebase' : 'JWT') : 'none',
    userId: user?.id,
    userEmail: user?.email,
    allStorageKeys: Object.keys(localStorage).filter(key => 
      key.includes('token') || key.includes('user') || key.includes('auth')
    )
  });

  if (!token) {
    console.log("❌ No token found in any storage key");
    return null;
  }

  if (!user) {
    console.log("❌ No user data found in storage");
    return null;
  }

  if (!user.id || !user.email) {
    console.log("❌ User missing required fields:", {
      hasId: !!user.id,
      hasEmail: !!user.email
    });
    return null;
  }

  console.log("✅ User validation successful");
  return user;
};

// Export the configured axios instance for API calls
export default api;