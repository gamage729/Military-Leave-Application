import React, { useState, useEffect, useRef } from 'react';
import '../styles/ChatBot.css';
import axios from 'axios';
import Sidebar from './Sidebar'; // Import the Sidebar component

const ChatBot = () => {
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [activePage, setActivePage] = useState('chatbot'); // Track active page

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  const USER_ID = 'user123'; // Typically from authenticated user data

  // Persistent quick action buttons
  const quickActions = [
    "Check leave types",
    "Report sick leave"
  ];

  // Scroll to the latest message whenever the messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set chatbot as active page when component mounts
  useEffect(() => {
    setActivePage('chatbot');
  }, []);

  // Check if the backend server is available when the component mounts
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`);
        console.log('Server connection:', response.data);
        
        // Add welcome message
        setMessages([{
          id: Date.now(),
          text: "Hello! I'm your leave management assistant. How can I help you today?",
          sender: 'bot',
          timestamp: new Date().toISOString(),
          responseData: {
            type: 'welcome',
            guidance: "Hello! I'm your leave management assistant. How can I help you today?",
            nextSteps: [],
            contacts: {}
          }
        }]);
      } catch (error) {
        console.error('Server connection error:', error);
        setError('Unable to connect to leave management system. Please try again later.');
      }
    };

    checkServerConnection();
  }, []);

  const sendToDialogflow = async (message) => {
    try {
      setIsTyping(true);
      
      const res = await axios.post('http://localhost:5001/webhook/dialogflow', {
        queryResult: {
          queryText: message
        }
      });
  
      const reply = res.data.fulfillmentText;
      
      // Simulate typing delay for more natural feel
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false);
  
      if (reply) {
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          text: reply,
          sender: 'dialogflow',
          timestamp: new Date().toISOString(),
          responseData: {
            type: 'dialogflow',
            guidance: reply,
            nextSteps: [],
            contacts: {}
          }
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          text: `I received your message but had trouble processing it. Please try again with more specific details.`,
          sender: 'dialogflow',
          timestamp: new Date().toISOString()
        }]);
      }
  
    } catch (err) {
      console.error('Error sending to Dialogflow webhook:', err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        text: `Something went wrong while processing your request. Please try again later.`,
        sender: 'dialogflow',
        timestamp: new Date().toISOString()
      }]);
    }
  };
  
  // Handle quick action button clicks - immediately send the request
  const handleQuickAction = async (action) => {
    if (isLoading) return;
    
    // Add user message first
    const userMessage = {
      id: Date.now(),
      text: action,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
  
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setIsTyping(true);
  
    try {
      const response = await sendWithRetry(() =>
        axios.post(`${API_URL}/webhook`, {
          message: action,
          userId: USER_ID
        })
      );
      
      // Simulate typing delay for more natural feel
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false);
  
      const responseData = response?.data?.response;
  
      if (responseData?.guidance) {
        const botMessage = {
          id: Date.now() + 1,
          text: responseData.guidance,
          sender: 'bot',
          responseData,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        // If no valid response from main backend, fallback to Dialogflow
        await sendToDialogflow(action);
      }
  
    } catch (error) {
      console.warn('Backend webhook failed. Falling back to Dialogflow...');
      try {
        await sendToDialogflow(action);
      } catch (dialogflowError) {
        console.error('Dialogflow fallback also failed:', dialogflowError);
        setIsTyping(false);
  
        const errorMessage = {
          id: Date.now() + 1,
          text: 'Sorry, there was an error processing your request. Please try again or contact HR directly.',
          sender: 'bot',
          isError: true,
          responseData: {
            type: 'error',
            guidance: 'Sorry, there was an error processing your request. Please try again or contact HR directly.',
            nextSteps: ['Contact HR at 555-1212'],
            contacts: {
              hrMain: '555-1212',
              hrEmail: 'leaves@company.com'
            }
          },
          timestamp: new Date().toISOString()
        };
  
        setMessages((prev) => [...prev, errorMessage]);
        setError(`Error: ${dialogflowError.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle sending a message to the backend and processing the response
  const sendMessage = async (event) => {
    event.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
  
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
  
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);
    setIsTyping(true);
  
    try {
      const response = await sendWithRetry(() =>
        axios.post(`${API_URL}/webhook`, {
          message: inputMessage,
          userId: USER_ID
        })
      );
      
      // Simulate typing delay for more natural feel
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsTyping(false);
  
      const responseData = response?.data?.response;
  
      if (responseData?.guidance) {
        const botMessage = {
          id: Date.now() + 1,
          text: responseData.guidance,
          sender: 'bot',
          responseData,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        // If no valid response from main backend, fallback to Dialogflow
        await sendToDialogflow(inputMessage);
      }
  
    } catch (error) {
      console.warn('Backend webhook failed. Falling back to Dialogflow...');
      try {
        await sendToDialogflow(inputMessage);
      } catch (dialogflowError) {
        console.error('Dialogflow fallback also failed:', dialogflowError);
        setIsTyping(false);
  
        const errorMessage = {
          id: Date.now() + 1,
          text: 'Sorry, there was an error processing your request. Please try again or contact HR directly.',
          sender: 'bot',
          isError: true,
          responseData: {
            type: 'error',
            guidance: 'Sorry, there was an error processing your request. Please try again or contact HR directly.',
            nextSteps: ['Contact HR at 555-1212'],
            contacts: {
              hrMain: '555-1212',
              hrEmail: 'leaves@company.com'
            }
          },
          timestamp: new Date().toISOString()
        };
  
        setMessages((prev) => [...prev, errorMessage]);
        setError(`Error: ${dialogflowError.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Retry logic for failed API calls
  const sendWithRetry = async (apiCall, maxRetries = 3) => {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await apiCall();
      } catch (error) {
        retries++;
        console.warn(`API call failed, retry ${retries}/${maxRetries}`);
        if (retries >= maxRetries) {
          throw new Error('Server connection failed. Please check your network or try again later.');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
  };

  // Helper function to format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to get message card class based on priority
  const getCardClass = (message) => {
    const baseClass = message.sender === 'user' ? 'user-message' : 'bot-message';
    
    if (message.sender !== 'user') {
      if (message.isError) return `${baseClass} error-message`;
      switch (message.responseData?.priority) {
        case 'HIGH':
          return `${baseClass} bot-message-emergency`;
        case 'MEDIUM':
          return `${baseClass} bot-message-priority`;
        default:
          return baseClass;
      }
    }
    
    return baseClass;
  };

  // Render next steps for the user
  const renderNextSteps = (steps) => {
    if (!steps || !steps.length) return null;
    return (
      <div className="next-steps">
        <h4>Next Steps:</h4>
        <ul>
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Render contact information
  const renderContacts = (contacts) => {
    if (!contacts || Object.keys(contacts).length === 0) return null;
    return (
      <div className="contacts">
        <h4>Contact Information:</h4>
        <ul>
          {Object.entries(contacts).map(([key, value]) => (
            <li key={key}><strong>{key}:</strong> {value}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Handle sidebar option selection
  const handleSidebarOptionSelect = (optionId) => {
    // Set active page
    setActivePage(optionId);
    
    // You can implement specific actions based on sidebar selections
    console.log(`Selected option: ${optionId}`);
    
    // Example: Add a system message based on the selected option
    let systemMessage;
    
    switch(optionId) {
      case 'my-leave':
        systemMessage = "Checking your leave balance...";
        handleQuickAction("Show my leave balance");
        break;
      case 'request-leave':
        systemMessage = "Let's request some leave. What dates are you looking at?";
        break;
      case 'leave-history':
        systemMessage = "Let me fetch your leave history...";
        handleQuickAction("Show my leave history");
        break;
      case 'leave-types':
        systemMessage = "Here are the available leave types...";
        handleQuickAction("Check leave types");
        break;
      case 'hr-contact':
        systemMessage = "Here's how to contact HR...";
        handleQuickAction("Contact HR");
        break;
      case 'chatbot':
        systemMessage = "How can I help you today with your leave management?";
        break;
      default:
        systemMessage = `You selected ${optionId}. How can I help with this?`;
    }
    
    if (systemMessage) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: systemMessage,
        sender: 'system',
        timestamp: new Date().toISOString(),
        responseData: {
          type: 'system',
          guidance: systemMessage
        }
      }]);
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        onSelectOption={handleSidebarOptionSelect} 
        userId={USER_ID} 
        userName="Employee Name"
        activePage={activePage}
      />
      
      <div className="chatbot-container">
        <div className="chatbot-header">
          <h2>Leave Management Assistant</h2>
        </div>
        
        <div className="messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={getCardClass(msg)}>
              <div className="message-content">
                <p className="response-guidance">{msg.text}</p>
                {msg.sender !== 'user' && (
                  <>
                    {renderNextSteps(msg.responseData?.nextSteps)}
                    {renderContacts(msg.responseData?.contacts)}
                  </>
                )}
              </div>
              <div className="message-timestamp">{formatTime(msg.timestamp)}</div>
            </div>
          ))}
          
          {isTyping && (
            <div className="bot-message typing-container">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Persistent quick action buttons */}
        <div className="persistent-actions">
          {quickActions.map((action, index) => (
            <button 
              key={index} 
              className="quick-action-btn"
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
            >
              {action}
            </button>
          ))}
        </div>
        
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        
        <form className="chat-input-form" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Type your leave request..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !inputMessage.trim()}
            className="send-button"
            aria-label="Send message"
          >
            {isLoading ? '...' : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9" 
                  stroke={isLoading || !inputMessage.trim() ? "#ccc" : "#007bff"}
                  strokeWidth="2"
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;