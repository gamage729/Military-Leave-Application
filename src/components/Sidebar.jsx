import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/SidebarStyles.css";
import sidebarTopImage from '../assets/images/sidebar-top.jpg';
import { authAPI } from '../utils/auth';
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ activeMenu: externalActiveMenu, setActiveMenu: externalSetActiveMenu }) => {
  const { logout: contextLogout } = useAuth();
  const [internalActiveMenu, setInternalActiveMenu] = useState(externalActiveMenu || 'dashboard');
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

  // Sync activeMenu with current route
  useEffect(() => {
    const path = location.pathname.substring(1);
    
    if (location.state?.scrollToApplyForLeave) {
      setActiveMenu('apply-for-leave');
      return;
    }
  
    const menuMap = {
      'dashboard': 'dashboard',
      'leave': 'leave',
      'news': 'news',
      'chatbot': 'chatbot',
      'settings': 'settings'
    };

    setActiveMenu(menuMap[path] || 'dashboard');
  }, [location.pathname, location.state, setActiveMenu]);

  // Enhanced logout function
  const logout = async () => {
    try {
      await contextLogout(); // Use context logout first
      await authAPI.logout(); // Then call API logout
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API fails
      localStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  // Navigation handler with proper auth checks
  const navigateToSection = async (section) => {
    try {
      // Check authentication status
      if (!authAPI.isAuthenticated()) {
        navigate("/login");
        return;
      }

      // Handle special case for apply-for-leave
      if (section === 'apply-for-leave') {
        setActiveMenu('apply-for-leave');
        
        if (location.pathname !== '/dashboard') {
          navigate('/dashboard', { 
            state: { scrollToApplyForLeave: true },
            replace: true
          });
        } else {
          const element = document.getElementById('apply-for-leave');
          element?.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      // Update active menu
      setActiveMenu(section);

      // Handle navigation for other sections
      const routeMap = {
        'dashboard': '/dashboard',
        'leave': '/leave',
        'news': '/news',
        'chatbot': '/chatbot',
        'settings': '/settings'
      };

      const targetPath = routeMap[section] || '/dashboard';
      
      if (location.pathname === targetPath) {
        // Scroll to top if already on the same page
        window.scrollTo(0, 0);
      } else {
        navigate(targetPath, { replace: true });
      }

    } catch (error) {
      console.error("Navigation error:", error);
      navigate("/login", { replace: true });
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