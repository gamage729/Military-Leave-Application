import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import LeavesRemaining from "./LeavesRemaining";
import Sidebar from "./Sidebar";
import FloatingChatBot from "./FloatingChatBot";
import "../styles/DashboardStyles.css";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase-config";

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


const UserProfile = ({ user, logout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const goToSettings = () => {
    navigate('/settings');
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  // Handle case where user data might be null or incomplete
  const firstName = user?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User';
  const displayName = user?.rank ? `${user.rank} ${firstName}` : firstName;

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
              <div className="user-menu-name">{user?.name || user?.displayName || 'User'}</div>
              <div className="user-menu-rank">{user?.rank || 'Rank'}</div>
              <div className="user-menu-email">{user?.email || ''}</div>
            </div>
          </div>
          <div className="user-menu-divider"></div>
          <ul className="user-menu-options">
            <li onClick={goToSettings}>
              <FontAwesomeIcon icon={faCog} />
              <span>Settings</span>
            </li>
            <li onClick={handleLogout}>
              <FontAwesomeIcon icon={solidIcons.faSignOutAlt} />
              <span>Logout</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};


const CircularChart = ({ approved = 0, pending = 0, rejected = 0, total = 0 }) => {
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

const Calendar = ({ leaveDays }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  const isLeaveDay = (date) => {
    return leaveDays.find(leave => {
      const leaveStart = new Date(leave.date);
      const leaveEnd = new Date(leave.endDate);
      return date >= leaveStart && date <= leaveEnd;
    });
  };

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

  const getFirstDayOfMonth = () => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    return firstDay.getDay();
  };

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
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day disabled"></div>
        ))}
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




const Dashboard = () => {
  const { user: authUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null); // Add user profile state
  const [overviewData, setOverviewData] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    leaveDays: [],
    recentRequests: []
  });
  const [entitlementData, setEntitlementData] = useState(null);
  const [previousLeaves, setPreviousLeaves] = useState([]);
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [leaveData, setLeaveData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    attachments: []
  });
  const [dataLoading, setDataLoading] = useState({
    overview: true,
    entitlement: true,
    previousLeaves: true,
    announcements: true,
    userProfile: true // Add user profile loading state
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState({});
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Add refs to prevent duplicate calls
  const fetchInProgress = useRef(false);
  const abortControllerRef = useRef(null);
  const lastFetchTime = useRef(0);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
   // Rest of your useEffect hooks remain the same...
   useEffect(() => {
    if (!authUser?.uid) return;

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchInProgress.current = false;
    };
  }, [authUser?.uid]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    console.log("API Response Structure:", {
      overview: overviewData,
      entitlement: entitlementData,
      previousLeaves: previousLeaves,
      announcements: announcementsData,
      userProfile: userProfile // Add to logging
    });
  }, [overviewData, entitlementData, previousLeaves, announcementsData, userProfile]);

  

  const fetchData = async () => {
    if (!authUser?.uid) {
      console.log('No authenticated user - skipping fetch');
      return;
    }
  
    try {
      console.log('Starting data fetch for user:', authUser.uid);
      
      let token;
      try {
        if (typeof authUser.getIdToken === 'function') {
          token = await authUser.getIdToken(true);
        } else {
          const currentUser = auth.currentUser;
          if (currentUser && typeof currentUser.getIdToken === 'function') {
            token = await currentUser.getIdToken(true);
          } else {
            throw new Error('Authentication token unavailable');
          }
        }
      } catch (tokenError) {
        console.error('Token retrieval error:', tokenError);
        throw new Error('Failed to get authentication token');
      }
  
      const headers = { Authorization: `Bearer ${token}` };
  
      setDataLoading({
        overview: true,
        entitlement: true,
        previousLeaves: true,
        announcements: true,
        userProfile: true
      });
  
      // Make API calls with individual error handling
      const results = await Promise.allSettled([
        apiClient.get(`/dashboard/overview/${authUser.uid}`, { headers }),
        apiClient.get(`/dashboard/entitlement/${authUser.uid}`, { headers }),
        apiClient.get(`/dashboard/previous-leaves/${authUser.uid}`, { headers }),
        apiClient.get('/dashboard/announcements', { headers }),
        apiClient.get(`/auth/me`, { headers })
      ]);
  
      console.log('API results:', results);
  
      // Handle each result individually
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          switch (index) {
            case 0:
              setOverviewData(result.value.data.data || {});
              break;
            case 1:
              setEntitlementData(result.value.data.data || null);
              break;
            case 2:
              setPreviousLeaves(result.value.data.data || []);
              break;
            case 3:
              setAnnouncementsData(result.value.data.data || []);
              break;
            case 4:
              setUserProfile(result.value.data.user || null);
              break;
          }
        } else {
          console.warn(`API call ${index} failed:`, result.reason);
          
          // Handle specific errors
          if (result.reason?.response?.status === 403) {
            console.warn('403 Forbidden - User may not be properly registered in backend');
          } else if (result.reason?.response?.status === 404) {
            console.warn('404 Not Found - Endpoint or user data not found');
          }
        }
      });
  
    } catch (error) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        console.log('Authentication failed - logging out');
        logout();
      }
    } finally {
      setDataLoading({
        overview: false,
        entitlement: false,
        previousLeaves: false,
        announcements: false,
        userProfile: false
      });
    }
  };

  const fetchUserProfile = async () => {
    if (!authUser?.uid) return;
  
    try {
      let token;
      try {
        if (typeof authUser.getIdToken === 'function') {
          token = await authUser.getIdToken(true);
        } else {
          // Fallback: Try to get token from Firebase auth current user
          const currentUser = auth.currentUser;
          if (currentUser && typeof currentUser.getIdToken === 'function') {
            token = await currentUser.getIdToken(true);
          } else {
            throw new Error('Authentication token unavailable');
          }
        }
      } catch (tokenError) {
        console.error('Token retrieval error:', tokenError);
        throw new Error('Failed to get authentication token');
      }
  
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await apiClient.get(`/auth/me`, { headers });
      setUserProfile(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setDataLoading(prev => ({ ...prev, userProfile: false }));
    }
  };

  

  // ====== OTHER HANDLER FUNCTIONS (AFTER useEffect) ======
  
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    try {
      // Handle JavaScript Date objects
      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString();
      }
      
      // Handle ISO strings (YYYY-MM-DD)
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateValue).toLocaleDateString();
      }
      
      // Handle your colon format (YYYY:MM:DD)
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}:\d{2}:\d{2}$/)) {
        const [year, month, day] = dateValue.split(':');
        return new Date(year, month - 1, day).toLocaleDateString();
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'N/A';
    }
  };

  const calculateDays = (startDate, endDate) => {
    try {
      const parseDate = (dateValue) => {
        if (!dateValue) return null;
        
        // Already a Date object
        if (dateValue instanceof Date) return dateValue;
        
        // Handle ISO strings
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return new Date(dateValue);
        }
        
        // Handle colon format
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}:\d{2}:\d{2}$/)) {
          const [year, month, day] = dateValue.split(':');
          return new Date(year, month - 1, day);
        }
        
        return null;
      };
  
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      
      if (!start || !end) return 'N/A';
      
      const timeDiff = end - start;
      return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    } catch (error) {
      console.error('Error calculating days:', error);
      return 'N/A';
    }
  };
  
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      // Get fresh authentication token
      const token = await authUser.getIdToken(true);
      
      // Validate dates before sending
      const startDate = leaveData.startDate;
      const endDate = leaveData.endDate;
      
      // Ensure dates are in YYYY-MM-DD format
      const formatDateForBackend = (dateStr) => {
        if (!dateStr) return '';
        // If it's already in YYYY-MM-DD format, return as is
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateStr;
        }
        // Otherwise, try to parse and format
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      };
  
      const formattedStartDate = formatDateForBackend(startDate);
      const formattedEndDate = formatDateForBackend(endDate);
      
      // DEBUG: Log the data being sent
      console.log('=== FRONTEND DEBUG ===');
      console.log('Original dates:', { startDate, endDate });
      console.log('Formatted dates:', { formattedStartDate, formattedEndDate });
      console.log('Leave data being sent:', {
        leaveType: leaveData.leaveType,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        reason: leaveData.reason,
        hasAttachments: leaveData.attachments && leaveData.attachments.length > 0
      });
  
      // Validate that dates are properly formatted
      if (!formattedStartDate || !formattedEndDate) {
        throw new Error('Invalid date format. Please select valid dates.');
      }
      
      if (formattedStartDate > formattedEndDate) {
        throw new Error('End date must be after start date.');
      }
  
      // Check if we're sending FormData or JSON
      const shouldSendFormData = leaveData.attachments && leaveData.attachments.length > 0;
      
      let requestData;
      let headers = {
        'Authorization': `Bearer ${token}`
      };
  
      if (shouldSendFormData) {
        // Send as FormData if there are attachments
        requestData = new FormData();
        requestData.append('leaveType', leaveData.leaveType);
        requestData.append('startDate', formattedStartDate);
        requestData.append('endDate', formattedEndDate);
        requestData.append('reason', leaveData.reason);
        
        Array.from(leaveData.attachments).forEach(file => {
          requestData.append('attachments', file);
        });
        
        // Don't set Content-Type for FormData - let browser set it
        console.log('Sending as FormData with attachments');
      } else {
        // Send as JSON if no attachments
        requestData = {
          leaveType: leaveData.leaveType,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          reason: leaveData.reason
        };
        
        headers['Content-Type'] = 'application/json';
        console.log('Sending as JSON (no attachments)');
      }
  
      console.log('Request headers:', headers);
  
      // Use apiClient with proper authentication
      const response = await apiClient.post('/dashboard/apply', requestData, { headers });
  
      if (response.data.success) {
        // Calculate days difference
        const start = new Date(formattedStartDate);
        const end = new Date(formattedEndDate);
        const timeDiff = end.getTime() - start.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  
        // Update entitlement data
        setEntitlementData(prev => {
          if (!prev || !prev.leaveTypes) return prev;
          
          const updatedLeaveTypes = prev.leaveTypes.map(type => {
            if (type.name === leaveData.leaveType) {
              return {
                ...type,
                used: type.used + daysDiff,
                remaining: Math.max(0, type.total - (type.used + daysDiff))
              };
            }
            return type;
          });
  
          const usedLeaves = updatedLeaveTypes.reduce((sum, lt) => sum + lt.used, 0);
          const remainingLeaves = updatedLeaveTypes.reduce((sum, lt) => sum + lt.remaining, 0);
          const totalLeaves = usedLeaves + remainingLeaves;
  
          return {
            ...prev,
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
          attachments: []
        });
  
        const fileInput = document.getElementById('document-upload');
        if (fileInput) fileInput.value = '';
  
        alert('Leave request submitted successfully!');
  
        // Refresh data
        await fetchData();
      }
    } catch (error) {
      console.error('Leave submission error:', error);
      console.error('Error response:', error.response?.data);
      
      // Better error handling
      let errorMessage = 'Failed to submit leave request';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        logout();
      } else if (error.response?.status === 404) {
        errorMessage = 'Server endpoint not found. Please contact support.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request data';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading check - FIXED
  const isLoading = Object.values(dataLoading).some(loading => loading === true);
  
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Loading Dashboard...
        </div>
      </div>
    );
  }

  const approvalRate = overviewData?.total > 0 
  ? Math.round((overviewData.approved / overviewData.total) * 100) 
  : 0;

  console.log("Previous leaves data:", previousLeaves.map(leave => ({
    id: leave.id,
    type: leave.leaveType,
    startDate: leave.startDate,
    endDate: leave.endDate,
    startDateType: typeof leave.startDate,
    endDateType: typeof leave.endDate
  })));
 

return (
  <div className="dashboard-container">
    <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
    
    <div className="main-content">
      <div className="header" id="dashboard-top">
        <h1>Dashboard</h1>
        <UserProfile user={authUser} logout={logout} />
      </div>

      {/* Error Messages */}
      {Object.values(error).some(err => err) && (
        <div className="error-container">
          {Object.entries(error).map(([key, err]) => 
            err && (
              <div key={key} className="error-message">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                Error loading {key}: {err}
              </div>
            )
          )}
        </div>
      )}

        {/* Stats Cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/total-requests.png" alt="Total Requests" />
            </div>
            <h3>Total Leave Requests</h3>
            <h2>{dataLoading.overview ? '...' : overviewData?.total || 0}</h2>
            <p>All time requests</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/approved.png" alt="Approved" />
            </div>
            <h3>Approved</h3>
            <h2>{dataLoading.overview ? '...' : overviewData.approved || 0}</h2>
            <p>{approvalRate}% approval rate</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/pending1.png" alt="Pending" />
            </div>
            <h3>Pending</h3>
            <h2>{dataLoading.overview ? '...' : overviewData.pending || 0}</h2>
            <p>Awaiting approval</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/icons/rejected.png" alt="Rejected" />
            </div>  
            <h3>Rejected</h3>
            <h2>{dataLoading.overview ? '...' : overviewData.rejected || 0}</h2>
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
              {dataLoading.overview ? (
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
                        {overviewData?.approved || 0}
                      </div>
                      <div className="leave-label">Approved</div>
                    </div>
                    <div className="leave-number-item">
                      <div className="leave-number">
                        <span className="color-dot pending"></span>
                        {overviewData?.pending || 0}
                      </div>
                      <div className="leave-label">Pending</div>
                    </div>
                    <div className="leave-number-item">
                      <div className="leave-number">
                        <span className="color-dot rejected"></span>
                        {overviewData?.rejected || 0}
                      </div>
                      <div className="leave-label">Rejected</div>
                    </div>
                  </div>
                  
                  {/* Circular Chart */}
                  <div className="chart-container">
                    <CircularChart 
                      approved={overviewData?.approved || 0}
                      pending={overviewData?.pending || 0}
                      rejected={overviewData?.rejected || 0}
                      total={overviewData?.total || 0}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Calendar and Announcements */}
          <div className="calendar-announcements-wrapper">
            <div className="calendar-section">
              <Calendar leaveDays={overviewData?.leaveDays || []} />
            </div>
            <div className="announcements-section">
              <Announcements 
                announcements={announcementsData} 
                loading={dataLoading.announcements}
              />
            </div>
          </div>
        </div>
        
        {/* Leaves Remaining section */}
        <div className="leaves-remaining-section">
          {dataLoading.entitlement ? (
            <div className="loading-section">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading leave balances...</p>
            </div>
          ) : entitlementData ? (
            <LeavesRemaining 
              total={entitlementData.total || 0}
              used={entitlementData.used || 0}
              remaining={entitlementData.remaining || 0}
            />
          ) : (
            <div className="no-entitlement-data">
              <p>No leave entitlement data available</p>
            </div>
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
              {dataLoading.previousLeaves ? (
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
                    previousLeaves.map((leave) => {
                      // Use raw data if main fields are missing
                      const effectiveData = leave._raw || leave;
                      
                      const startDate = effectiveData.startDate;
                      const endDate = effectiveData.endDate;
                      const leaveType = effectiveData.leaveType || effectiveData.type || 'N/A';
                      const status = effectiveData.status?.toLowerCase() || 'pending';
                      const days = effectiveData.leaveDays || calculateDays(startDate, endDate);

                      return (
                        <div key={leave.id} className="table-row">
                          <div>{leaveType}</div>
                          <div>{formatDate(startDate)}</div>
                          <div>{formatDate(endDate)}</div>
                          <div>{days}</div>
                          <div className={`status ${status}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            {status === 'rejected' && effectiveData.rejectionReason && (
                              <div className="rejection-tooltip">
                                {effectiveData.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
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