import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/DashboardStyles.css"; // Import external CSS

const Dashboard = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-image">
          <img 
            src="https://media.istockphoto.com/id/932608578/photo/happy-soldier-home-from-deployment.jpg?s=612x612&w=0&k=20&c=zPtFNfZldH_Jk_UFXnwILOrtdctTok8XO4pJF1VrSzY=" 
            alt="Dashboard" 
          />
        </div>
        <h2>Special Force Dashboard</h2>
        <p>Manage your activities efficiently with quick access.</p>
        <div className="dashboard-buttons">
          <button onClick={() => navigate("/leave")}>Request Leave</button>
          <button onClick={() => navigate("/admin")}>Admin Panel</button>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;