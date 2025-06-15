// src/services/api.js
import axios from 'axios';
import { auth } from '../firebase-config';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints
export const registerWithBackend = (userData) => 
  apiClient.post('/auth/register', userData);

export const loginWithBackend = (userData) => 
  apiClient.post('/auth/login', userData);

// Leave endpoints
export const submitLeave = (leaveData) =>
  apiClient.post('/leave/request', leaveData);

export const getLeaveRequests = () =>
  apiClient.get('/leave/all');

export const overrideLeave = (id, decision) =>
  apiClient.put('/leave/override', { id, admin_override: decision });

// Dashboard endpoints
export const getDashboardOverview = (userId) =>
  apiClient.get(`/api/dashboard/overview/${userId}`);

export const getLeaveEntitlement = (userId) =>
  apiClient.get(`/api/dashboard/entitlement/${userId}`);

export const getPreviousLeaves = (userId, limit = 5) =>
  apiClient.get(`/api/dashboard/previous-leaves/${userId}?limit=${limit}`);

export const getAnnouncements = (userId) =>
  apiClient.get(`/api/dashboard/announcements/${userId}`);

// Combined Dashboard Data Fetch
export const fetchAllDashboardData = async (userId) => {
  try {
    const [overview, entitlement, leaves, announcements] = await Promise.all([
      getDashboardOverview(userId),
      getLeaveEntitlement(userId),
      getPreviousLeaves(userId),
      getAnnouncements(userId)
    ]);
    
    return {
      overview: overview.data,
      entitlement: entitlement.data,
      previousLeaves: leaves.data,
      announcements: announcements.data
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};

// User endpoints
export const getUserProfile = () =>
  apiClient.get('/auth/me');

export const updateUserProfile = (userData) =>
  apiClient.put('/auth/me', userData);

// Utility function for handling errors
export const handleApiError = (error) => {
  if (error.response) {
    return {
      error: error.response.data.message || "An error occurred",
      status: error.response.status
    };
  } else if (error.request) {
    return { error: "No response received from server" };
  } else {
    return { error: error.message };
  }
};

export default apiClient;