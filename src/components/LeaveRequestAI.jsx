import React, { useState } from "react";
import axios from "axios";
import "../styles/LeaveStyles.css";
import { Link } from "react-router-dom";

// Custom function to parse and format structured content
const formatStructuredContent = (content) => {
  // Basic markdown-like parsing
  return content
    .split('\n')
    .map((line, index) => {
      // Handle headings and bold text
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={index} className="structured-heading">{line.replace(/\*\*/g, '')}</h3>;
      }
      
      // Handle section titles (numbered or not)
      if (line.match(/^\*\*\d+\.\s/) || line.match(/^\*\*[A-Za-z]/)) {
        return <h4 key={index} className="structured-section">{line.replace(/\*\*/g, '')}</h4>;
      }
      
      // Handle list items
      if (line.trim().startsWith('- ')) {
        return <li key={index} className="structured-list-item">{line.trim().substring(2)}</li>;
      }
      
      // Handle numbered steps
      if (line.match(/^\d+\.\s/)) {
        return <div key={index} className="structured-step">{line}</div>;
      }
      
      // Regular paragraph text
      if (line.trim()) {
        return <p key={index} className="structured-paragraph">{line}</p>;
      }
      
      return null;
    })
    .filter(Boolean); // Remove null items
};

const LeaveRequestAI = () => {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      content: "Hello, I'm your military leave AI assistant. I can help with specific military leave requests, regulations, and protocols. How can I assist you today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const token = localStorage.getItem("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setChat([...chat, userMessage]); // Update UI immediately
    setInput(""); // Clear input field
    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5001/leave/analyze",
        { reason: input },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Format the AI response from DeepSeek to ensure it's structured
      const aiMessage = { 
        role: "assistant", 
        content: response.data.suggestion,
        structured: true // Flag to identify structured responses
      };
      
      setChat((prevChat) => [...prevChat, aiMessage]); // Append AI response
    } catch (error) {
      console.error("Error submitting request:", error);
      
      // Add error message to chat
      const errorMessage = { 
        role: "assistant", 
        content: "Sorry, I encountered an error processing your request. Please try again later." 
      };
      setChat((prevChat) => [...prevChat, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <Link to="/chatbot" className="back-button">
          &larr; Back to Leave Assistant
        </Link>
        <h2>Military Leave AI Assistant</h2>
      </div>
      
      <div className="ai-chat-box">
        {chat.map((msg, index) => (
          <div key={index} className={msg.role === "user" ? "user-message" : "ai-message"}>
            <div className={`message-bubble ${msg.structured ? "structured-bubble" : ""}`}>
              {msg.structured ? (
                <div className="structured-response">
                  {formatStructuredContent(msg.content)}
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            <div className="message-info">
              <span>{msg.role === "user" ? "You" : "Military AI"}</span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="ai-message">
            <div className="message-bubble typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="ai-chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your military leave query here..."
          className="ai-chat-input"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="ai-chat-button"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </form>
      
      <div className="ai-help-hints">
        <h4>Example queries:</h4>
        <ul>
          <li>What documents do I need for compassionate leave?</li>
          <li>How many days of annual leave am I entitled to?</li>
          <li>What's the protocol for emergency leave?</li>
          <li>Who needs to approve my medical leave?</li>
        </ul>
      </div>
    </div>
  );
};

export default LeaveRequestAI;