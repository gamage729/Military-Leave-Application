// utils/auth.js (Frontend)
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001'; // Adjust to your backend URL

// Helper to get access token from localStorage
const getAccessToken = () => localStorage.getItem('accessToken');

// Helper to get refresh token from localStorage
const getRefreshToken = () => localStorage.getItem('refreshToken');

// Helper to parse user data safely
const getUserFromStorage = () => {
  const userStr = localStorage.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
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

// Response interceptor: handle 401 by attempting token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { token: refreshToken });
          const { accessToken } = response.data;

          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed: clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token found, redirect to login immediately
        window.location.href = '/login';
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!(getAccessToken() && getUserFromStorage());
  },

  // Get current logged-in user object
  getCurrentUser: () => {
    return getUserFromStorage();
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
};
export const ensureValidToken = async () => {
  const token = localStorage.getItem("accessToken");

  if (!token) throw new Error("No access token found");

  try {
    const payload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      throw new Error("Access token expired");
    }

    return true;
  } catch (error) {
    console.error("Invalid token:", error);
    throw new Error("Invalid token");
  }
};

// Export the configured axios instance for API calls
export default api;
