// src/components/Sidebar.jsx
import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from "react-router-dom";
import "../styles/SidebarStyles.css";
import sidebarTopImage from '../assets/images/sidebar-top.jpg';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const navigate = useNavigate();
  
  const {
    faHome,
    faCalendarAlt,
    faFileAlt,
    faUsers,
    faCog,
    faSignOutAlt
  } = solidIcons;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="sidebar">
      {/* Top Image */}
      <div className="sidebar-top-image">
        <img 
          src={sidebarTopImage} 
          alt="Sidebar Top" 
          style={{ width: '118%', height: '85px', objectFit: 'cover' }}
        />
      </div>

      <div className="sidebar-menu">
        <div 
          className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveMenu('dashboard')}
        >
          <FontAwesomeIcon icon={faHome} />
          <span>Dashboard</span>
        </div>

        <div 
          className={`menu-item ${activeMenu === 'leave' ? 'active' : ''}`}
          onClick={() => {
            setActiveMenu('leave');
            navigate("/leave");
          }}
        >
          <FontAwesomeIcon icon={faCalendarAlt} />
          <span>Leave Requests</span>
        </div>

        <div 
          className={`menu-item ${activeMenu === 'news' ? 'active' : ''}`}
          onClick={() => {
            setActiveMenu('news');
            navigate("/news");
          }}
        >
          <FontAwesomeIcon icon={faFileAlt} />
          <span>News</span>
        </div>

        {/* Chatbot Link */}
        <div 
        className={`menu-item ${activeMenu === 'chatbot' ? 'active' : ''}`}
        onClick={() => {
          setActiveMenu('chatbot');
          navigate("/chatbot"); // This will route to /chatbot page
        }}
      >
        <FontAwesomeIcon icon={faUsers} />
        <span>Chatbot</span>
      </div>

        <div 
          className={`menu-item ${activeMenu === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveMenu('settings')}
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
