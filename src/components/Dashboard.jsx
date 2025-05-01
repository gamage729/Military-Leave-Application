import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from "react-router-dom";
import LeavesRemaining from "./LeavesRemaining"; 
import Sidebar from "./Sidebar";
import FloatingChatBot from "./FloatingChatBot";
import "../styles/DashboardStyles.css"  

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
    faExclamationTriangle
  } = solidIcons;

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

    const isSameMonth = (date1, date2) => {
      return (
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
      );
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
            const leave = leaveDays.find(l => isSameDay(l.date, day));
            return (
              <div
                key={day.getTime()}
                className={`calendar-day 
                  ${isSameDay(day, selectedDate) ? 'selected' : ''}
                  ${leave ? leave.type : ''}`}
                onClick={() => setSelectedDate(day)}
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
  const Announcements = ({ announcements }) => {
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
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement, index) => (
              <div key={index} className={`announcement-item ${announcement.type}`}>
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
    
    const approvedLength = (approved / total) * circumference;
    const pendingLength = (pending / total) * circumference;
    const rejectedLength = (rejected / total) * circumference;

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

          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="12"
          />
          
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
        </svg>
        <div className="circular-chart-center">
          <span className="circular-chart-value">{total}</span>
          <span className="circular-chart-label">Total Requests</span>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation(); // Get location from useLocation hook
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [leaveData, setLeaveData] = useState({
      leaveType: '',
      startDate: '',
      endDate: '',
      reason: ''
    });

    useEffect(() => {
      // If coming from sidebar with scrollToApplyForLeave state, scroll to that section
      if (location.state?.scrollToApplyForLeave) {
        const element = document.getElementById('apply-for-leave');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Otherwise, scroll to top when dashboard mounts
        window.scrollTo(0, 0);
      }
    }, [location.state]);

    const leaveOverviewData = {
      approved: 3,
      pending: 1,
      rejected: 20,
      total: 24,
      leaveDays: [
        { date: new Date(), type: 'approved' },
        { 
          date: new Date(new Date().setDate(new Date().getDate() + 2)), 
          type: 'pending' 
        },
        { 
          date: new Date(new Date().setDate(new Date().getDate() + 5)), 
          type: 'rejected' 
        },
      ]
    };

    const previousLeaves = [
      { id: 1, type: 'Annual', start: '2023-05-10', end: '2023-05-17', days: 7, status: 'Approved' },
      { id: 2, type: 'Medical', start: '2023-04-01', end: '2023-04-05', days: 4, status: 'Approved' },
      { id: 3, type: 'Emergency', start: '2023-03-15', end: '2023-03-16', days: 1, status: 'Rejected' },
    ];

    // Sample announcement data
    const announcementsData = [
      {
        title: "System Maintenance",
        message: "The leave management system will be unavailable on Sunday, April 27th from 02:00-04:00 for scheduled maintenance.",
        date: "April 25, 2025",
        type: "info",
        category: "system"
      },
      {
        title: "New Leave Policy Update",
        message: "Effective May 1st, all emergency leave requests require supporting documentation within 48 hours of submission.",
        date: "April 22, 2025",
        type: "urgent",
        category: "admin"
      },
      {
        title: "Training Leave Applications",
        message: "All personnel are reminded that training leave applications must be submitted at least 14 days in advance.",
        date: "April 18, 2025",
        type: "standard",
        category: "admin"
      },
      {
        title: "System Update Completed",
        message: "The recent system update has added new features to the leave management dashboard.",
        date: "April 15, 2025",
        type: "info",
        category: "system"
      }
    ];

    const logout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    };

    const handleLeaveSubmit = (e) => {
      e.preventDefault();
      setShowLeaveForm(false);
      setLeaveData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: ''
      });
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setLeaveData(prev => ({
        ...prev,
        [name]: value
      }));
    };
    
    const leaveEntitlementData = {
      totalLeaves: 30,
      usedLeaves: 12,
      remainingLeaves: 18,
      leaveTypes: [
        { name: 'Annual', used: 8, remaining: 12, total: 20 },
        { name: 'Medical', used: 2, remaining: 8, total: 10 },
        { name: 'Emergency', used: 2, remaining: 3, total: 5 },
      ]
    };

    return (
      <div className="dashboard-container">
        {/* Sidebar */}
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        
        <div className="main-content">
          <div className="header" id="dashboard-top">
            <h1>Dashboard</h1>
            <div className="user-profile">
              <div className="notifications">
                <FontAwesomeIcon icon={faBell} />
                <FontAwesomeIcon icon={faEnvelope} />
              </div>
              <div className="user-info">
                <h4>Commander Smith</h4>
                <p>Special Forces Unit</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons/total-requests.png" alt="Total Requests" />
              </div>
              <h3>Total Leave Requests</h3>
              <h2>{leaveOverviewData.total}</h2>
              <p>+12% from last month</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons/approved.png" alt="Approved" />
              </div>
              <h3>Approved</h3>
              <h2>{leaveOverviewData.approved}</h2>
              <p>72% approval rate</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons/pending1.png" alt="Pending" />
              </div>
              <h3>Pending</h3>
              <h2>{leaveOverviewData.pending}</h2>
              <p>18% pending approval</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <img src="/icons/rejected.png" alt="Rejected" />
              </div>  
              <h3>Rejected</h3>
              <h2>{leaveOverviewData.rejected}</h2>
              <p>10% rejection rate</p>
            </div>
          </div>

          {/* Overview section */}
          <div className="overview-section">
            {/* Chart and Leave stats */}
            <div className="overview-panel">
              <div className="panel-header">
                <h2>Leave Overview</h2>
              </div>
              <div className="panel-content">
                {/* Leave Numbers */}
                <div className="leave-numbers">
                  <div className="leave-number-item">
                    <div className="leave-number">
                      <span className="color-dot approved"></span>
                      {leaveOverviewData.approved}
                    </div>
                    <div className="leave-label">Approved</div>
                  </div>
                  <div className="leave-number-item">
                    <div className="leave-number">
                      <span className="color-dot pending"></span>
                      {leaveOverviewData.pending}
                    </div>
                    <div className="leave-label">Pending</div>
                  </div>
                  <div className="leave-number-item">
                    <div className="leave-number">
                      <span className="color-dot rejected"></span>
                      {leaveOverviewData.rejected}
                    </div>
                    <div className="leave-label">Rejected</div>
                  </div>
                </div>
                
                {/* Circular Chart */}
                <div className="chart-container">
                  <CircularChart 
                    approved={leaveOverviewData.approved}
                    pending={leaveOverviewData.pending}
                    rejected={leaveOverviewData.rejected}
                    total={leaveOverviewData.total}
                  />
                </div>
              </div>
            </div>
            
            {/* Calendar and Announcements */}
            <div className="calendar-announcements-wrapper">
              <div className="calendar-section">
                <Calendar leaveDays={leaveOverviewData.leaveDays} />
              </div>
              <div className="announcements-section">
                <Announcements announcements={announcementsData} />
              </div>
            </div>
          </div>
          
          {/* Leaves Remaining section */}
          <div className="leaves-remaining-section">
            <LeavesRemaining userData={leaveEntitlementData} />
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
                  
                    <div className="form-actions">
                      <button type="submit" className="submit-btn">
                        <FontAwesomeIcon icon={faPaperPlane} />
                        Submit Request
                      </button>
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Previous Leaves Table */}
              <div className="previous-leaves-section">
                <div className="leaves-table-container">
                  <div className="leaves-table">
                    <div className="table-header">
                      <div>Type</div>
                      <div>Start Date</div>
                      <div>End Date</div>
                      <div>Days</div>
                      <div>Status</div>
                    </div>
                    
                    {previousLeaves.map(leave => (
                      <div key={leave.id} className="table-row">
                        <div>{leave.type}</div>
                        <div>{leave.start}</div>
                        <div>{leave.end}</div>
                        <div>{leave.days}</div>
                        <div className={`status ${leave.status.toLowerCase()}`}>
                          {leave.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <FloatingChatBot />
      </div>
    );
  };

  export default Dashboard;