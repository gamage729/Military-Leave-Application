import React, { useEffect, useState } from "react";
import { getLeaveRequests, overrideLeave } from "../services/api";
import "../styles/AdminPanelStyles.css";

const AdminPanel = () => {
  const [requests, setRequests] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    const fetchRequests = async () => {
      const res = await getLeaveRequests(token);
      setRequests(res.data);
    };
    fetchRequests();
  }, [token]);

  const handleOverride = async (id, decision) => {
    await overrideLeave(id, decision, token);
    alert("Decision updated!");
    window.location.reload();
  };

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      <div className="requests-grid">
        {requests.map((req) => (
          <div key={req.id} className="request-card">
            <div>
              <p className="request-reason">Reason: {req.reason}</p>
              <p className="request-status">Status: {req.status}</p>
            </div>
            <div className="button-group">
              <button onClick={() => handleOverride(req.id, "approved")} className="approve-btn">Approve</button>
              <button onClick={() => handleOverride(req.id, "rejected")} className="reject-btn">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
