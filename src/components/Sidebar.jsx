// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/SidebarStyles.css";
import sidebarTopImage from '../assets/images/sidebar-top.jpg';
import { ensureValidToken } from '../utils/auth';


const Sidebar = ({ activeMenu: externalActiveMenu, setActiveMenu: externalSetActiveMenu }) => {
  // Create internal state if no external state management is provided
  const [internalActiveMenu, setInternalActiveMenu] = useState(externalActiveMenu || 'dashboard');
  
  // Use either the external state management or internal state
  const activeMenu = externalActiveMenu !== undefined ? externalActiveMenu : internalActiveMenu;
  const setActiveMenu = typeof externalSetActiveMenu === 'function' 
    ? externalSetActiveMenu 
    : setInternalActiveMenu;

  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    faHome,
    faCalendarAlt,
    faFileAlt,
    faUsers,
    faCog,
    faRobot,
    faSignOutAlt,
    faPaperPlane
  } = solidIcons;

  // Sync activeMenu with current route when location changes or component mounts
  useEffect(() => {
    const path = location.pathname.substring(1); // Remove the leading slash
    
    // Check if we're coming from a navigation with state
    if (location.state?.scrollToApplyForLeave) {
      setActiveMenu('apply-for-leave');
      return;
    }
  
    if (path === 'dashboard') {
      setActiveMenu('dashboard');
    } else if (path === 'leave') {
      setActiveMenu('leave');
    } else if (path === 'news') {
      setActiveMenu('news');
    } else if (path === 'chatbot') {
      setActiveMenu('chatbot');
    } else if (path === 'settings') {
      setActiveMenu('settings');
    }
  }, [location.pathname, location.state, setActiveMenu]);

// Updated logout function  
const logout = () => {
  // Clear all auth-related items consistently
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("token"); // Remove if you're no longer using this
  localStorage.removeItem("user");
  navigate("/login");
};

  // Function to handle section navigation
  const navigateToSection = async (section) => {
    // Use your actual token keys (accessToken instead of token)
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
  
    // Check if we're authenticated (using the same logic as your auth system)
    if (location.pathname !== '/login' && (!accessToken || !refreshToken)) {
      console.log("No valid tokens found, redirecting to login");
      navigate("/login");
      return;
    }
  
    // Optional: Validate tokens aren't expired
    try {
      await ensureValidToken(); // Use your existing token validation function
    } catch (error) {
      console.error("Token validation failed:", error);
      navigate("/login");
      return;
    }
  
    // Rest of your navigation logic remains the same
    if (section === 'apply-for-leave') {
      setActiveMenu('apply-for-leave');
      
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { state: { scrollToApplyForLeave: true } });
      } else {
        const element = document.getElementById('apply-for-leave');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      setActiveMenu(section);
      if (section === 'dashboard') {
        if (location.pathname === '/dashboard') {
          const topElement = document.getElementById('dashboard-top');
          if (topElement) {
            topElement.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo(0, 0);
          }
        } else {
          navigate('/dashboard');
        }
      } else {
        switch (section) {
          case 'leave':
            navigate('/leave');
            break;
          case 'news':
            navigate('/news');
            break;
          case 'chatbot':
            navigate('/chatbot');
            break;
          case 'settings':
            navigate('/settings');
            break;
          default:
            navigate('/dashboard');
        }
      }
    }
  };
  
  

  return (
    <div className="sidebar">
      {/* Top Image */}
      <div className="sidebar-top-image">
        <img 
          src={sidebarTopImage} 
          alt="Sidebar Top" 
          style={{ width: '115%', height: '140px', objectFit: 'cover' }}
        />
      </div>

      <div className="sidebar-menu">
        <div 
          className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigateToSection('dashboard')}
        >
          <FontAwesomeIcon icon={faHome} />
          <span>Dashboard</span>
        </div>

        <div 
          className={`menu-item ${activeMenu === 'apply-for-leave' ? 'active' : ''}`}
          onClick={() => navigateToSection('apply-for-leave')}
        >
          <FontAwesomeIcon icon={faPaperPlane} />
          <span>Apply for Leave</span>
        </div>

        <div 
          className={`menu-item ${activeMenu === 'news' ? 'active' : ''}`}
          onClick={() => navigateToSection('news')}
        >
          <FontAwesomeIcon icon={faFileAlt} />
          <span>News</span>
        </div>

        <div 
          className={`menu-item ${activeMenu === 'chatbot' ? 'active' : ''}`}
          onClick={() => navigateToSection('chatbot')}
        >
          <FontAwesomeIcon icon={faRobot} />
          <span>Chatbot</span>
        </div>

        <div 
          className={`menu-item ${activeMenu === 'settings' ? 'active' : ''}`}
          onClick={() => navigateToSection('settings')}
        >
          <FontAwesomeIcon icon={faCog} />
          <span>Settings</span>
        </div>
      </div>

      <div className="menu-item logout" onClick={logout}>
        <FontAwesomeIcon icon={faSignOutAlt} />
        <span>Logout</span>
      </div>
    </div>
  );
}

export default Sidebar;