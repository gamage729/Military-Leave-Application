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

  const firstName = user?.name?.split(' ')[0] || 'User';
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
              <div className="user-menu-name">{user?.name || 'User'}</div>
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


const Dashboard = () => {
  const { user: authUser, logout } = useAuth();
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
    announcements: true
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
    timeout: 20000, // Increased timeout for batch requests
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  const fetchData = async () => {
    if (!authUser?.uid) {
      console.log('No auth user - skipping fetch');
      return;
    }

    // Prevent duplicate calls within 1 second
    const now = Date.now();
    if (fetchInProgress.current || (now - lastFetchTime.current < 1000)) {
      console.log('Fetch already in progress or too recent, skipping...');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = now;

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      console.log('Starting batch data fetch for user:', authUser.uid);
      
      // Get fresh token
      const token = await authUser.getIdToken(true);
      console.log('Token refreshed successfully');
      
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Set loading states
      setDataLoading({
        overview: true,
        entitlement: true,
        previousLeaves: true,
        announcements: true
      });

      // Clear previous errors
      setError({});

      console.log('Making batch request to:', `/dashboard/batch/${authUser.uid}`);

      // Single batch request
      const response = await apiClient.get(`/dashboard/batch/${authUser.uid}`, {
        headers,
        signal: abortControllerRef.current.signal
      });

      console.log('Batch request completed successfully');

      const { data, errors } = response.data;

      // Set data from batch response
      if (data.overview) {
        setOverviewData(data.overview);
      }
      if (data.entitlement) {
        setEntitlementData(data.entitlement);
      }
      if (data.previousLeaves) {
        setPreviousLeaves(Array.isArray(data.previousLeaves) ? data.previousLeaves : []);
      }
      if (data.announcements) {
        setAnnouncementsData(Array.isArray(data.announcements) ? data.announcements : []);
      }

      // Handle any errors from batch response
      if (errors) {
        const hasErrors = Object.values(errors).some(error => error !== null);
        if (hasErrors) {
          console.warn('Some data failed to load:', errors);
          setError(errors);
        }
      }

      console.log('Batch data fetch completed successfully');

    } catch (error) {
      console.error('Batch fetch error:', error);
      
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      
      if (error.response?.status === 401 || error.message.includes('token')) {
        console.log('Authentication error - logging out');
        logout();
      } else {
        setError({
          overview: 'Failed to load data',
          entitlement: 'Failed to load data',
          previousLeaves: 'Failed to load data',
          announcements: 'Failed to load data'
        });
      }
    } finally {
      console.log('Setting loading states to false');
      setDataLoading({
        overview: false,
        entitlement: false,
        previousLeaves: false,
        announcements: false
      });
      fetchInProgress.current = false;
    }
  };

 
  // Improved useEffect with proper cleanup and debouncing
  useEffect(() => {
    if (!authUser?.uid) return;

    // Debounce the fetch call
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchInProgress.current = false;
    };
  }, [authUser?.uid]); // Only depend on uid

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  // Manual refresh function
  const refreshData = useCallback(async () => {
    fetchInProgress.current = false;
    lastFetchTime.current = 0;
    await fetchData();
  }, [authUser?.uid]);

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

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const formData = new FormData();
      formData.append('leaveType', leaveData.leaveType);
      formData.append('startDate', leaveData.startDate);
      formData.append('endDate', leaveData.endDate);
      formData.append('reason', leaveData.reason);
      
      if (leaveData.attachments) {
        Array.from(leaveData.attachments).forEach(file => {
          formData.append('attachments', file);
        });
      }
  
      const response = await axios.post('/dashboard/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  
      if (response.data.success) {
        // Calculate days difference
        const start = new Date(leaveData.startDate);
        const end = new Date(leaveData.endDate);
        const timeDiff = end.getTime() - start.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  
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
  
        // Refresh data - REPLACED THE THREE FUNCTIONS WITH fetchData()
        await fetchData();
      }
    } catch (error) {
      console.error('Leave submission error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit leave request';
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