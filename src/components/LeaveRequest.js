import React, { useState } from "react";
import { submitLeave } from "../services/api";

const LeaveRequest = () => {
  const [reason, setReason] = useState("");
  const token = localStorage.getItem("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitLeave({ user_id: 1, reason }, token);
      alert("Leave request submitted!");
    } catch (error) {
      alert("Error submitting request!");
    }
  };

  return (
    <div>
      <h2>Request Leave</h2>
      <form onSubmit={handleSubmit}>
        <textarea placeholder="Reason for leave" onChange={(e) => setReason(e.target.value)} required></textarea>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default LeaveRequest;
