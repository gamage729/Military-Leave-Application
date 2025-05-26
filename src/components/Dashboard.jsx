import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from "react-router-dom";
import LeavesRemaining from "./LeavesRemaining"; 
import Sidebar from "./Sidebar";
import FloatingChatBot from "./FloatingChatBot";
import "../styles/DashboardStyles.css";
import axios from 'axios';


// Access icons
const {
  faHome,
  faCalendarAlt,
  faFileAlt,
  faUsers,
  faCog,
  faSignOutAlt,
  faBell,
  faEnvelope,
  faPlus,
  faChevronDown,
  faPaperPlane,
  faBullhorn,
  faInfoCircle,
  faExclamationTriangle,
  faUser,
  faCaretDown,
  faPaperclip,
  faCloudUploadAlt,
  faTimes,
  faFilePdf,
  faFileImage,
  faFileWord,
  faFile,
  faSpinner
} = solidIcons;



// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Modify your API calls to use the correct token
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken');

  // Debug: Log token info
  console.log('API Call Debug:', {
    endpoint,
    tokenExists: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
    tokenType: typeof token
  });

  if (!token) {
    console.error('No access token found');
    throw new Error('No access token available');
  }

  // Setup default headers
  const defaultHeaders = {
    Authorization: `Bearer ${token}`
  };

  // Only set Content-Type if body is JSON
  const isJson = options.body && typeof options.body === 'string' && options.body.trim().startsWith('{');
  if (isJson) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const finalHeaders = {
    ...defaultHeaders,
    ...(options.headers || {})
  };

  // Debug: Log request details
  console.log('Request Details:', {
    url: `${API_BASE_URL}${endpoint}`,
    method: options.method || 'GET',
    headers: finalHeaders,
    body: options.body ? JSON.parse(options.body) : undefined
  });

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: finalHeaders
    });

    // Debug: Log response metadata
    console.log('Response Debug:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      console.error('403 Forbidden:', errorData);
      throw new Error(`403 Forbidden: ${errorData.message || 'Access denied'}`);
    }

    if (response.status === 401) {
      console.warn('401 Unauthorized - Attempting token refresh...');
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken })
        });

        if (refreshResponse.ok) {
          const { accessToken } = await refreshResponse.json();
          localStorage.setItem('accessToken', accessToken);
          console.log('Token refreshed. Retrying original request...');
          return apiCall(endpoint, options); // Retry
        }
      }

      // Token refresh failed
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('API Error Response Body:', data);
      throw new Error(`HTTP ${response.status}: ${data.message || response.statusText}`);
    }
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('API Error Response Body:', errorBody);
      throw new Error(`HTTP ${response.status}: ${errorBody.message || response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

const validateTokenAndUser = () => {
  // 1. Retrieve tokens and user data
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const storedUser = localStorage.getItem('user');

  // 2. Debug logging (consider removing in production)
  console.log('Token Validation:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasUser: !!storedUser,
    accessTokenPrefix: accessToken?.slice(0, 10), // Safer than logging full length
    refreshTokenPrefix: refreshToken?.slice(0, 10)
  });

  // 3. Basic presence check
  if (!accessToken || !refreshToken || !storedUser) {
    console.warn('Missing authentication data');
    return null;
  }

  // 4. Parse and validate user data
  let user;
  try {
    user = JSON.parse(storedUser);
    
    // Validate required user fields
    if (!user?.id || typeof user.id !== 'string') {
      console.error('Invalid user ID');
      return null;
    }
    
    if (!user?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      console.error('Invalid user email');
      return null;
    }

    console.log('Valid User Data:', {
      id: user.id.slice(0, 8) + '...', // Truncate for security
      email: user.email,
      role: user.role || 'unknown'
    });
  } catch (error) {
    console.error('User data parsing failed:', error);
    return null;
  }

  // 5. Basic JWT validation (optional)
  try {
    if (!accessToken.includes('.') || accessToken.split('.').length !== 3) {
      console.error('Malformed access token');
      return null;
    }

    // Check token expiration if it's a JWT
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.warn('Token expired');
      return null;
    }

    // Verify token matches user (basic check)
    if (payload.sub && payload.sub !== user.id) {
      console.error('Token-user mismatch');
      return null;
    }
  } catch (error) {
    console.warn('Token validation warning:', error);
    // Continue even if token validation fails (server will verify)
  }

  return user;
};

// Calendar Component
const Calendar = ({ leaveDays }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Navigation functions
  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const prevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentMonth(prev);
  };

  // Date comparison helpers
  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  // Check if a date falls within a leave period
  const isLeaveDay = (date) => {
    return leaveDays.find(leave => {
      const leaveStart = new Date(leave.date);
      const leaveEnd = new Date(leave.endDate);
      return date >= leaveStart && date <= leaveEnd;
    });
  };

  // Generate days for current month view
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Get first day of month to calculate offset
  const getFirstDayOfMonth = () => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    return firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)
  };

  // Format month and year for display
  const formatMonthYear = () => {
    return currentMonth.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });
  };

  const daysInMonth = getDaysInMonth();
  const firstDayOffset = getFirstDayOfMonth();

  return (
    <div className="calendar-container1">
      <div className="calendar-header">
        <button className="calendar-nav-button" onClick={prevMonth}>&lt;</button>
        <h3>{formatMonthYear()}</h3>
        <button className="calendar-nav-button" onClick={nextMonth}>&gt;</button>
      </div>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
        {/* Empty cells for days before the first of the month */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day disabled"></div>
        ))}
        {/* Days of the month */}
        {daysInMonth.map(day => {
          const leave = isLeaveDay(day);
          return (
            <div
              key={day.getTime()}
              className={`calendar-day 
                ${isSameDay(day, selectedDate) ? 'selected' : ''}
                ${leave ? leave.type : ''}`}
              onClick={() => setSelectedDate(day)}
              title={leave ? `${leave.leaveType} Leave` : ''}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Announcements Component
const Announcements = ({ announcements, loading }) => {
  const [activeTab, setActiveTab] = useState('system');

  const getIcon = (type) => {
    switch (type) {
      case 'urgent':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="announcement-icon urgent" />;
      case 'info':
        return <FontAwesomeIcon icon={faInfoCircle} className="announcement-icon info" />;
      default:
        return <FontAwesomeIcon icon={faBullhorn} className="announcement-icon" />;
    }
  };

  const filteredAnnouncements = announcements.filter(
    announcement => announcement.category === activeTab
  );

  return (
    <div className="announcements-container">
      <div className="announcements-header">
        <h3>Announcements</h3>
        <div className="announcement-tabs">
          <button 
            className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            System
          </button>
          <button 
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin
          </button>
        </div>
      </div>
      <div className="announcements-content">
        {loading ? (
          <div className="loading-announcements">
            <FontAwesomeIcon icon={faSpinner} spin />
            <p>Loading announcements...</p>
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((announcement, index) => (
            <div key={announcement.id || index} className={`announcement-item ${announcement.type}`}>
              <div className="announcement-icon-container">
                {getIcon(announcement.type)}
              </div>
              <div className="announcement-details">
                <h4>{announcement.title}</h4>
                <p>{announcement.message}</p>
                <div className="announcement-meta">
                  <span className="announcement-date">{announcement.date}</span>
                  {announcement.type === 'urgent' && (
                    <span className="urgent-tag">URGENT</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-announcements">
            <p>No {activeTab} announcements at this time</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CircularChart = ({ approved, pending, rejected, total }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const approvedLength = total > 0 ? (approved / total) * circumference : 0;
  const pendingLength = total > 0 ? (pending / total) * circumference : 0;
  const rejectedLength = total > 0 ? (rejected / total) * circumference : 0;

  return (
    <div className="circular-chart-wrapper">
      <svg viewBox="0 0 100 100" className="circular-chart-svg">
        <defs>
          <linearGradient id="approvedGradient" gradientTransform="rotate(120)">
            <stop offset="0%" stopColor="#32de84" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>

          <linearGradient id="pendingGradient" gradientTransform="rotate(120)">
            <stop offset="0%" stopColor="#FEBE10" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          <linearGradient id="rejectedGradient" gradientTransform="rotate(120)">
            <stop offset="0%" stopColor="#F40009" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="12"
        />

        {/* Approved */}
        {approved > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#approvedGradient)"
            strokeWidth="12"
            strokeDasharray={`${approvedLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        )}

        {/* Pending */}
        {pending > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#pendingGradient)"
            strokeWidth="12"
            strokeDasharray={`${pendingLength} ${circumference}`}
            strokeDashoffset={`-${approvedLength}`}
            strokeLinecap="round"
          />
        )}

        {/* Rejected */}
        {rejected > 0 && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#rejectedGradient)"
            strokeWidth="12"
            strokeDasharray={`${rejectedLength} ${circumference}`}
            strokeDashoffset={`-${approvedLength + pendingLength}`}
            strokeLinecap="round"
          />
        )}
      </svg>

      <div className="circular-chart-center">
        <span className="circular-chart-value">{total}</span>
        <span className="circular-chart-label">Total Requests</span>
      </div>
    </div>
  );
};

// User Profile Component
const UserProfile = ({ user, logout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const goToSettings = () => {
    navigate('/settings');
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  // Get first name only
  const firstName = user.name ? user.name.split(' ')[0] : 'User';
  const displayName = user.rank ? `${user.rank} ${firstName}` : firstName;

  return (
    <div className="user-profile-container">
      <div className="user-profile" onClick={toggleMenu}>
        <div className="user-avatar">
          <FontAwesomeIcon icon={faUser} />
        </div>
        <span className="user-name">{displayName}</span>
        <FontAwesomeIcon icon={faCaretDown} className="dropdown-icon" />
      </div>
      
      {isMenuOpen && (
        <div className="user-dropdown-menu">
          <div className="user-menu-header">
            <div className="user-menu-avatar">
              <FontAwesomeIcon icon={faUser} />
            </div>
            <div className="user-menu-details">
              <div className="user-menu-name">{user.name || 'Unknown User'}</div>
              <div className="user-menu-rank">{user.rank || 'N/A'}</div>
              <div className="user-menu-email">{user.email || 'N/A'}</div>
            </div>
          </div>
          <div className="user-menu-divider"></div>
          <ul className="user-menu-options">
            <li onClick={goToSettings}>
              <FontAwesomeIcon icon={faCog} />
              <span>Settings</span>
            </li>
            <li onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOutAlt} />
              <span>Logout</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState({
    overview: true,
    entitlement: true,
    announcements: true,
    previousLeaves: true
  });
  const [error, setError] = useState({});
  const [authError, setAuthError] = useState(null);
  
  // State for API data
  const [overviewData, setOverviewData] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
    total: 0,
    leaveDays: [],
    recentRequests: []
  });
  
  const [entitlementData, setEntitlementData] = useState({
    totalLeaves: 0,
    usedLeaves: 0,
    remainingLeaves: 0,
    leaveTypes: []
  });
  
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [previousLeaves, setPreviousLeaves] = useState([]);
  const [leaveData, setLeaveData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    attachments: null
  });
  
  const [user, setUser] = useState({
    name: "Loading...",
    email: "",
    rank: "", 
    role: "soldier",
    id: ""
  });

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/login");
  };
  const ensureValidToken = async () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Basic validation
    if (!accessToken || !refreshToken) {
      console.error('Missing tokens - access:', !!accessToken, 'refresh:', !!refreshToken);
      throw new Error('Authentication required');
    }
  
    // Basic JWT format validation
    if (!/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(accessToken)) {
      console.warn('Malformed access token structure');
      await refreshAccessToken();
      return;
    }
  
    try {
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Validate payload structure
      if (!tokenPayload.exp) {
        console.warn('Token missing expiration - forcing refresh');
        await refreshAccessToken();
        return;
      }
      
      // Refresh if token expires soon or is already expired
      if (tokenPayload.exp - currentTime < 300) {
        console.log(`Token expiring soon (${tokenPayload.exp - currentTime}s remaining)`);
        await refreshAccessToken();
      }
    } catch (error) {
      console.error('Token validation error:', error);
      await refreshAccessToken();
    }
  };
  
  const refreshAccessToken = async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.error('No refresh token available');
      await clearAuthAndRedirect();
      throw new Error('Session expired');
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': crypto.randomUUID() // For tracking requests
        },
        body: JSON.stringify({ token: refreshToken })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 401 || response.status === 403) {
          console.error('Refresh token rejected:', errorData);
          await clearAuthAndRedirect();
          throw new Error('Session expired');
        }
        
        // Retry for server errors
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
          console.warn(`Retrying refresh (attempt ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return refreshAccessToken(retryCount + 1);
        }
        
        throw new Error(errorData.message || 'Token refresh failed');
      }
  
      const { accessToken, refreshToken: newRefreshToken } = await response.json();
      
      // Validate new tokens
      if (!accessToken) {
        throw new Error('No access token in response');
      }
      
      localStorage.setItem('accessToken', accessToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
      
      console.log('Token refresh successful');
      return accessToken;
      
    } catch (error) {
      console.error('Refresh failed:', error);
      
      // Don't retry for network errors if we've already retried
      if (retryCount >= MAX_RETRIES || error.message === 'Session expired') {
        await clearAuthAndRedirect();
      }
      
      throw error;
    }
  };
  
  const clearAuthAndRedirect = async () => {
    // Clear all auth-related items
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Optional: Clear any cached sensitive data
    // await caches.delete('auth-data');
    
    // Redirect to login with state for recovery
    navigate('/login', { 
      state: { 
        from: window.location.pathname,
        reason: 'session_expired'
      } 
    });
  };

  // Enhanced fetch functions with auth error handling
  const fetchOverviewData = async (userId) => {
    try {
      setLoading(prev => ({ ...prev, overview: true }));
      
      // Ensure we have a valid token before making the call
      await ensureValidToken();
      
      const response = await apiCall(`/dashboard/overview/${userId}`);
      
      if (response.success) {
        const { overview, leaveDays, recentRequests } = response.data;
        setOverviewData({
          approved: overview.approved,
          pending: overview.pending,
          rejected: overview.rejected,
          total: overview.total,
          leaveDays: leaveDays.map(day => ({
            date: new Date(day.date),
            endDate: new Date(day.endDate),
            type: day.type,
            leaveType: day.leaveType
          })),
          recentRequests
        });
        setError(prev => ({ ...prev, overview: null }));
      }
    } catch (err) {
      console.error('Error fetching overview data:', err);
      setError(prev => ({ ...prev, overview: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  };

  const fetchEntitlementData = async (userId) => {
    try {
      setLoading(prev => ({ ...prev, entitlement: true }));
      const response = await apiCall(`/dashboard/entitlement/${userId}`);
  
      if (response.success) {
        const leaveTypes = response.data.leaveTypes;
  
        //  Dynamically sum used + remaining for all types
        const usedLeaves = leaveTypes.reduce((sum, lt) => sum + lt.used, 0);
        const remainingLeaves = leaveTypes.reduce((sum, lt) => sum + lt.remaining, 0);
        const totalLeaves = usedLeaves + remainingLeaves;
  
        setEntitlementData({
          totalLeaves,
          usedLeaves,
          remainingLeaves,
          leaveTypes
        });
  
        setError(prev => ({ ...prev, entitlement: null }));
      }
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('401')) {
        setAuthError('Your session has expired. Please login again.');
        logout();
      } else {
        console.error('Error fetching entitlement data:', err);
        setError(prev => ({ ...prev, entitlement: err.message }));
      }
    } finally {
      setLoading(prev => ({ ...prev, entitlement: false }));
    }
  };
  
  
  const fetchAnnouncements = async () => {
    try {
      setLoading(prev => ({ ...prev, announcements: true }));
      const response = await apiCall('/dashboard/announcements');
      if (response.success) {
        setAnnouncementsData(response.data);
        setError(prev => ({ ...prev, announcements: null }));
      }
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('401')) {
        setAuthError('Your session has expired. Please login again.');
        logout();
      } else {
        console.error('Error fetching announcements:', err);
        setError(prev => ({ ...prev, announcements: err.message }));
      }
    } finally {
      setLoading(prev => ({ ...prev, announcements: false }));
    }
  };

  const fetchPreviousLeaves = async (userId) => {
    try {
      setLoading(prev => ({ ...prev, previousLeaves: true }));
      const response = await apiCall(`/dashboard/previous-leaves/${userId}?limit=5`);
      
      if (response.success) {
        const mappedLeaves = response.data.map(leave => ({
          id: leave.id,
          leaveType: leave.type,
          startDate: leave.start,
          endDate: leave.end,
          leaveDays: leave.days,
          status: leave.status,
          reason: leave.reason,
          createdAt: leave.createdAt,
          approvedBy: leave.approvedBy,
          rejectionReason: leave.rejectionReason
        }));
        
        setPreviousLeaves(mappedLeaves);
        setError(prev => ({ ...prev, previousLeaves: null }));
      }
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('401')) {
        setAuthError('Your session has expired. Please login again.');
        logout();
      } else {
        console.error('Error fetching previous leaves:', err);
        setError(prev => ({ ...prev, previousLeaves: err.message }));
      }
    } finally {
      setLoading(prev => ({ ...prev, previousLeaves: false }));
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      // Debug logging
      console.log("=== Dashboard Initialization ===");
      
      // 1. Token Validation
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const storedUser = localStorage.getItem("user");
      
      console.log("Auth Status:", {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        storedUser: !!storedUser
      });
  
      // 2. Handle missing tokens
      if (!accessToken || !refreshToken) {
        console.log("Missing tokens - redirecting to login");
        navigate("/login");
        return;
      }
  
      // 3. Parse and validate user data
      let currentUser = {
        name: "Loading...",
        email: "",
        rank: "", 
        role: "soldier",
        id: ""
      };
  
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
          console.log("User Data:", {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role
          });
  
          if (!currentUser.id) {
            throw new Error("Invalid user data - missing ID");
          }
        } catch (error) {
          console.error("User data error:", error);
          localStorage.clear();
          navigate("/login");
          return;
        }
      }
  
      // 4. Set user state
      setUser(currentUser);
  
      // 5. Token refresh check (if token is about to expire)
      try {
        await ensureValidToken();
      } catch (error) {
        console.error("Token validation failed:", error);
        logout();
        return;
      }
  
      // 6. Data fetching with improved error handling
      const fetchData = async () => {
        try {
          console.log("Starting data fetch for user:", currentUser.id);
          
          // Sequential fetching with delays
          await Promise.all([
            fetchOverviewData(currentUser.id),
            new Promise(resolve => setTimeout(resolve, 500)).then(() => fetchEntitlementData(currentUser.id)),
            new Promise(resolve => setTimeout(resolve, 1000)).then(() => fetchPreviousLeaves(currentUser.id)),
            new Promise(resolve => setTimeout(resolve, 1500)).then(() => fetchAnnouncements())
          ]);
  
        } catch (error) {
          console.error("Data fetch error:", error);
          
          // Handle specific error cases
          if (error?.response?.status === 401) {
            try {
              console.log("Attempting token refresh after 401 error");
              await refreshAccessToken();
              // Retry the failed request(s)
              if (error.config?.url.includes("overview")) {
                await fetchOverviewData(currentUser.id);
              }
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              logout();
            }
          }
        }
      };
  
      await fetchData();
  
      // 7. Handle scroll behavior (kept from your original)
      if (location.state?.scrollToApplyForLeave) {
        setTimeout(() => {
          const element = document.getElementById('apply-for-leave');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 2000);
      } else {
        window.scrollTo(0, 0);
      }
    };
  
    initializeDashboard();
  
    // Cleanup function
    return () => {
      
    };
  }, [navigate, location.state]);

  // File handling functions (unchanged)
  const handleFileChange = (e) => {
    const files = e.target.files;
    setLeaveData(prev => ({
      ...prev,
      attachments: files
    }));
  };

  const removeFile = (indexToRemove) => {
    if (!leaveData.attachments) return;
    
    const updatedFiles = Array.from(leaveData.attachments).filter((_, index) => index !== indexToRemove);
    const dataTransfer = new DataTransfer();
    updatedFiles.forEach(file => dataTransfer.items.add(file));
    
    setLeaveData(prev => ({
      ...prev,
      attachments: dataTransfer.files.length > 0 ? dataTransfer.files : null
    }));
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return faFilePdf;
    if (fileType.includes('image')) return faFileImage;
    if (fileType.includes('word') || fileType.includes('document')) return faFileWord;
    return faFile;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const response = await apiCall('/dashboard/apply', {
        method: 'POST',
        body: JSON.stringify({
          leaveType: leaveData.leaveType,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          reason: leaveData.reason
        })
      });
  
      if (response.success) {
        // Calculate days difference
        const start = new Date(leaveData.startDate);
        const end = new Date(leaveData.endDate);
        const timeDiff = end.getTime() - start.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end days
  
        // Update entitlement data
        setEntitlementData(prev => {
          const updatedLeaveTypes = prev.leaveTypes.map(type => {
            if (type.name === leaveData.leaveType) {
              return {
                ...type,
                used: type.used + daysDiff,
                remaining: type.total - (type.used + daysDiff)
              };
            }
            return type;
          });
  
          const usedLeaves = updatedLeaveTypes.reduce((sum, lt) => sum + lt.used, 0);
          const remainingLeaves = updatedLeaveTypes.reduce((sum, lt) => sum + lt.remaining, 0);
          const totalLeaves = usedLeaves + remainingLeaves;
  
          return {
            totalLeaves,
            usedLeaves,
            remainingLeaves,
            leaveTypes: updatedLeaveTypes
          };
        });
  
        // Reset form
        setLeaveData({
          leaveType: '',
          startDate: '',
          endDate: '',
          reason: '',
          attachments: null
        });
  
        const fileInput = document.getElementById('document-upload');
        if (fileInput) fileInput.value = '';
  
        alert('Leave request submitted successfully!');
  
        // Refresh data
        if (user.id) {
          fetchOverviewData(user.id);
          fetchEntitlementData(user.id);
          fetchPreviousLeaves(user.id);
        }
      }
    } catch (error) {
      // ... existing error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const approvalRate = overviewData.total > 0 
    ? Math.round((overviewData.approved / overviewData.total) * 100) 
    : 0;

  return (
    <div className="dashboard-container">
      <Sidebar activeMenu={activeMenu } setActiveMenu={setActiveMenu} />
      
      <div className="main-content">
        <div className="header" id="dashboard-top">
          <h1>Dashboard</h1>
          <UserProfile user={user} logout={logout} />
        </div>

        {/* Auth Error Display */}
        {authError && (
          <div className="auth-error">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            {authError}
            <button onClick={() => navigate('/login')}>Login</button>
          </div>
        )}


        {/* Stats Cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/total-requests.png" alt="Total Requests" />
            </div>
            <h3>Total Leave Requests</h3>
            <h2>{loading.overview ? '...' : overviewData.total}</h2>
            <p>All time requests</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/approved.png" alt="Approved" />
            </div>
            <h3>Approved</h3>
            <h2>{loading.overview ? '...' : overviewData.approved}</h2>
            <p>{approvalRate}% approval rate</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/pending1.png" alt="Pending" />
            </div>
            <h3>Pending</h3>
            <h2>{loading.overview ? '...' : overviewData.pending}</h2>
            <p>Awaiting approval</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/rejected.png" alt="Rejected" />
            </div>  
            <h3>Rejected</h3>
            <h2>{loading.overview ? '...' : overviewData.rejected}</h2>
            <p>Need revision</p>
          </div>
        </div>

        {/* Error Messages */}
        {Object.values(error).some(err => err) && (
          <div className="error-container">
            {Object.entries(error).map(([key, err]) => 
              err && !err.includes('expired') && !err.includes('401') && (
                <div key={key} className="error-message">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  Error loading {key}: {err}
                </div>
              )
            )}
          </div>
        )}

        {/* Overview section */}
        <div className="overview-section">
          {/* Chart and Leave stats */}
          <div className="overview-panel">
            <div className="panel-header">
              <h2>Leave Overview</h2>
            </div>
            <div className="panel-content">
              {loading.overview ? (
                <div className="loading-section">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <p>Loading overview...</p>
                </div>
              ) : (
                <>
                  {/* Leave Numbers */}
                  <div className="leave-numbers">
                    <div className="leave-number-item">
                      <div className="leave-number">
                        <span className="color-dot approved"></span>
                        {overviewData.approved}
                      </div>
                      <div className="leave-label">Approved</div>
                    </div>
                    <div className="leave-number-item">
                      <div className="leave-number">
                        <span className="color-dot pending"></span>
                        {overviewData.pending}
                      </div>
                      <div className="leave-label">Pending</div>
                    </div>
                    <div className="leave-number-item">
                      <div className="leave-number">
                        <span className="color-dot rejected"></span>
                        {overviewData.rejected}
                      </div>
                      <div className="leave-label">Rejected</div>
                    </div>
                  </div>
                  
                  {/* Circular Chart */}
                  <div className="chart-container">
                    <CircularChart 
                      approved={overviewData.approved}
                      pending={overviewData.pending}
                      rejected={overviewData.rejected}
                      total={overviewData.total}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Calendar and Announcements */}
          <div className="calendar-announcements-wrapper">
            <div className="calendar-section">
              <Calendar leaveDays={overviewData.leaveDays} />
            </div>
            <div className="announcements-section">
              <Announcements 
                announcements={announcementsData} 
                loading={loading.announcements}
              />
            </div>
          </div>
        </div>
        
        {/* Leaves Remaining section */}
        <div className="leaves-remaining-section">
          {loading.entitlement ? (
            <div className="loading-section">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading leave balances...</p>
            </div>
          ) : (
            <LeavesRemaining userData={entitlementData} />
          )}
        </div>

        {/* Leave Application and History */}
        <div className="leave-application-history" id="apply-for-leave">
          <div className="section-headers">
            <h2>Apply for Leave</h2>
            <h2>Previous Leave Requests</h2>
          </div>
          
          <div className="leave-application-container">
            {/* Leave Application Form */}
            <div className="leave-application">
              <form onSubmit={handleLeaveSubmit} className="modern-leave-form">
                <div className="form-grid">
                  {/* Leave Type */}
                  <div className="form-group">
                    <label className="form-label">Leave Type</label>
                    <select 
                      className="form-input"
                      name="leaveType" 
                      value={leaveData.leaveType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Leave Type</option>
                      <option value="Annual">Annual Leave</option>
                      <option value="Medical">Medical Leave</option>
                      <option value="Emergency">Emergency Leave</option>
                      <option value="Training">Training Leave</option>
                      <option value="Casual">Casual Leave</option>
                      <option value="Travel">Travel Leave</option>
                    </select>
                  </div>
                  
                  {/* Date Range */}
                  <div className="form-group date-range-group">
                    <label className="form-label">Date Range</label>
                    <div className="date-inputs">
                      <div className="date-input">
                        <span className="date-label">From</span>
                        <input 
                          type="date" 
                          className="form-input"
                          name="startDate"
                          value={leaveData.startDate}
                          onChange={handleInputChange}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div className="date-input">
                        <span className="date-label">To</span>
                        <input 
                          type="date" 
                          className="form-input"
                          name="endDate"
                          value={leaveData.endDate}
                          onChange={handleInputChange}
                          min={leaveData.startDate || new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Reason */}
                  <div className="form-group full-width">
                    <label className="form-label">Reason</label>
                    <textarea 
                      className="form-input form-textarea"
                      name="reason"
                      value={leaveData.reason}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      placeholder="Briefly explain the reason for your leave..."
                    />
                  </div>

                  {/* Document Attachments */}
                  <div className="form-group full-width">
                    <label className="form-label">
                      <FontAwesomeIcon icon={faPaperclip} className="label-icon" />
                      Attach Documents (Optional)
                    </label>
                    <div className="file-upload-area">
                      <div className="file-input-wrapper">
                        <input
                          type="file"
                          id="document-upload"
                          className="file-input"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                          onChange={handleFileChange}
                        />
                        <label htmlFor="document-upload" className="file-input-label">
                          <FontAwesomeIcon icon={faCloudUploadAlt} className="upload-icon" />
                          <span className="upload-text">
                            {leaveData.attachments && leaveData.attachments.length > 0 
                              ? `${leaveData.attachments.length} file(s) selected`
                              : 'Choose files or drag and drop'
                            }
                          </span>
                          <span className="upload-hint">
                            PDF, DOC, DOCX, JPG, PNG, TXT (Max 10MB each)
                          </span>
                        </label>
                      </div>
                      
                      {/* File List */}
                      {leaveData.attachments && leaveData.attachments.length > 0 && (
                        <div className="uploaded-files">
                          {Array.from(leaveData.attachments).map((file, index) => (
                            <div key={index} className="file-item">
                              <div className="file-info">
                                <FontAwesomeIcon 
                                  icon={getFileIcon(file.type)} 
                                  className="file-type-icon"
                                />
                                <div className="file-details">
                                  <span className="file-name">{file.name}</span>
                                  <span className="file-size">{formatFileSize(file.size)}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="remove-file-btn"
                                onClick={() => removeFile(index)}
                                title="Remove file"
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* File Upload Guidelines */}
                    <div className="upload-guidelines">
                      <p className="guidelines-title">
                        <FontAwesomeIcon icon={faInfoCircle} />
                        Document Guidelines:
                      </p>
                      <ul className="guidelines-list">
                        <li>Medical Leave: Medical certificates or doctor's notes</li>
                        <li>Emergency Leave: Supporting documentation if applicable</li>
                        <li>Training Leave: Training invitation or course details</li>
                        <li>Travel Leave: Travel itinerary or booking confirmations</li>
                      </ul>
                    </div>
                  </div>
                
                  <div className="form-actions">
                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} spin />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faPaperPlane} />
                          Submit Request
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Previous Leaves Table */}
            <div className="previous-leaves-section">
              {loading.previousLeaves ? (
                <div className="loading-section">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <p>Loading leave history...</p>
                </div>
              ) : (
                <div className="leaves-table-container">
                  <div className="leaves-table">
                    <div className="table-header">
                      <div>Type</div>
                      <div>Start Date</div>
                      <div>End Date</div>
                      <div>Days</div>
                      <div>Status</div>
                    </div>
                    
                    {previousLeaves.length > 0 ? (
                      previousLeaves.map(leave => (
                        <div key={leave.id} className="table-row" onClick={() => navigate(`/leave/${leave.id}`)}>
                          <div>{leave.leaveType}</div>
                          <div>{new Date(leave.startDate).toLocaleDateString()}</div>
                          <div>{new Date(leave.endDate).toLocaleDateString()}</div>
                          <div>{leave.leaveDays}</div>
                          <div className={`status ${leave.status.toLowerCase()}`}>
                            {leave.status}
                            {leave.status === 'rejected' && leave.rejectionReason && (
                              <div className="rejection-tooltip">
                                {leave.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-leaves">
                        <FontAwesomeIcon icon={faFileAlt} />
                        <p>No previous leave requests found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <FloatingChatBot />
    </div>
  );
};

export default Dashboard;