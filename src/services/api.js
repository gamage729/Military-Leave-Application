import axios from 'axios';
import { auth } from '../firebase-config';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Update the axios instance configuration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true, // Important for CORS with credentials
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Update the request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(true); // Force refresh
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Token refresh failed:', error);
        throw error;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await auth.currentUser?.getIdToken(true);
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth endpoints
export const registerWithBackend = (userData) => apiClient.post('/auth/register', userData);
export const loginWithBackend = (userData) => apiClient.post('/auth/login', userData);
export const getUserProfile = () => apiClient.get('/auth/me');
export const updateUserProfile = (userData) => apiClient.put('/auth/me', userData);

// Leave endpoints
export const submitLeave = (leaveData) => apiClient.post('/leave/request', leaveData);
export const getLeaveRequests = () => apiClient.get('/leave/all');
export const overrideLeave = (id, decision) => apiClient.put('/leave/override', { id, admin_override: decision });

// Dashboard endpoints
export const getDashboardOverview = (userId) => apiClient.get(`/dashboard/overview/${userId}`);
export const getLeaveEntitlement = (userId) => apiClient.get(`/dashboard/entitlement/${userId}`);
export const getPreviousLeaves = (userId, limit = 5) => apiClient.get(`/dashboard/previous-leaves/${userId}?limit=${limit}`);
export const getAnnouncements = () => apiClient.get('/dashboard/announcements');

// Combined data fetch
export const fetchAllDashboardData = async (userId) => {
  try {
    const [overview, entitlement, leaves, announcements] = await Promise.all([
      getDashboardOverview(userId),
      getLeaveEntitlement(userId),
      getPreviousLeaves(userId),
      getAnnouncements()
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

// Error handler
export const handleApiError = (error) => {
  if (error.response) {
    return {
      error: error.response.data.message || "Request failed",
      status: error.response.status
    };
  } else if (error.request) {
    return { error: "No response received" };
  } else {
    return { error: error.message };
  }
};

export default apiClient;