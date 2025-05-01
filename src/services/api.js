import axios from "axios";

const API_URL = "http://localhost:5001";

export const register = (userData) => axios.post(`${API_URL}/auth/register`, userData);
export const login = (userData) => axios.post(`${API_URL}/auth/login`, userData);
export const submitLeave = (leaveData, token) =>
  axios.post(`${API_URL}/leave/request`, leaveData, { headers: { Authorization: `Bearer ${token}` } });
export const getLeaveRequests = (token) =>
  axios.get(`${API_URL}/leave/all`, { headers: { Authorization: `Bearer ${token}` } });
export const overrideLeave = (id, decision, token) =>
  axios.put(`${API_URL}/leave/override`, { id, admin_override: decision }, { headers: { Authorization: `Bearer ${token}` } });
