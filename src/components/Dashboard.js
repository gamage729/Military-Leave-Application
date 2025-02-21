import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <button onClick={() => navigate("/leave")}>Request Leave</button>
      <button onClick={() => navigate("/admin")}>Admin Panel</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default Dashboard;
