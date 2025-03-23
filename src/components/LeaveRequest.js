import React, { useState } from "react";
import axios from "axios";
import "../styles/LeaveStyles.css";

const LeaveRequest = () => {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const token = localStorage.getItem("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setChat([...chat, userMessage]); // Update UI immediately

    try {
      const response = await axios.post(
        "http://localhost:5000/leave/analyze",
        { reason: input },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const aiMessage = { role: "assistant", content: response.data.suggestion };
      setChat([...chat, userMessage, aiMessage]); // Append AI response
      setInput(""); // Clear input field
    } catch (error) {
      alert("Error submitting request: " + error.message);
    }
  };

  return (
    <div className="chat-container">
      <h2 className="chat-title">Leave Request Chat</h2>
      <div className="chat-box">
        {chat.map((msg, index) => (
          <div key={index} className={msg.role === "user" ? "user-message" : "ai-message"}>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter reason or ask a follow-up question..."
          className="chat-input"
        />
        <button type="submit" className="chat-button">Send</button>
      </form>
    </div>
  );
};

export default LeaveRequest;
