import React, { useEffect, useState } from "react";
import { getLeaveRequests, overrideLeave } from "../services/api";

const AdminPanel = () => {
  const [requests, setRequests] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchRequests = async () => {
      const res = await getLeaveRequests(token);
      setRequests(res.data);
    };
    fetchRequests();
  }, []);

  const handleOverride = async (id, decision) => {
    await overrideLeave(id, decision, token);
    alert("Decision updated!");
    window.location.reload();
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      {requests.map((req) => (
        <div key={req.id}>
          <p>{req.reason}</p>
          <p>Status: {req.status}</p>
          <button onClick={() => handleOverride(req.id, "approved")}>Approve</button>
          <button onClick={() => handleOverride(req.id, "rejected")}>Reject</button>
        </div>
      ))}
    </div>
  );
};

export default AdminPanel;
