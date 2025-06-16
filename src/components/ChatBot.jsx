import React, { useState, useEffect, useRef } from 'react';
import '../styles/ChatBot.css';
import axios from 'axios';
import Sidebar from './Sidebar';
import { Link, useNavigate } from 'react-router-dom';

const militaryAssistantStyles = {
  militaryLeaveCard: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '50px',
    padding: '10px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textDecoration: 'none'
  },
  militaryIcon: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white'
  },
  militaryLabel: {
    margin: '0 0 0 8px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
    whiteSpace: 'nowrap'
  },
  militaryTooltip: {
    position: 'absolute',
    bottom: '60px',
    right: '0',
    width: '200px',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 3px 15px rgba(0, 0, 0, 0.2)',
    opacity: 0,
    visibility: 'hidden',
    transition: 'all 0.3s ease',
    pointerEvents: 'none'
  },
  militaryTooltipHeading: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  militaryTooltipText: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#555',
    lineHeight: 1.4
  }
};

const ChatBot = () => {
  const navigate = useNavigate(); // Add this hook for programmatic navigation
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [activePage, setActivePage] = useState('chatbot');
  const [showAIHelp, setShowAIHelp] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  const USER_ID = 'user123';

  const quickActions = [
    "Check leave types",
    "Report sick leave"
  ];

  // Handle navigation to AI assistant
  const handleAIAssistantClick = (e) => {
    e.preventDefault();
    console.log('Navigating to LeaveRequestAI...');
    navigate('/leave-request-ai');
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    setActivePage('chatbot');
  }, []);

  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`);
        console.log('Server connection:', response.data);
        
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

        setTimeout(() => {
          setShowAIHelp(true);
        }, 3000);
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
  
  const handleQuickAction = async (action) => {
    if (isLoading) return;
    
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

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  const handleSidebarOptionSelect = (optionId) => {
    setActivePage(optionId);
    
    console.log(`Selected option: ${optionId}`);
    
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
      
      {/* Military Leave AI Assistant - Updated with click handler */}
      {showAIHelp && (
        <div 
          style={militaryAssistantStyles.militaryLeaveCard}
          onClick={handleAIAssistantClick}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.querySelector('.ai-tooltip');
            if (tooltip) {
              tooltip.style.opacity = '1';
              tooltip.style.visibility = 'visible';
            }
          }}
          onMouseLeave={(e) => {
            const tooltip = e.currentTarget.querySelector('.ai-tooltip');
            if (tooltip) {
              tooltip.style.opacity = '0';
              tooltip.style.visibility = 'hidden';
            }
          }}
        >
          <div style={militaryAssistantStyles.militaryIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </div>
          <span style={militaryAssistantStyles.militaryLabel}>More help</span>
          
          {/* Tooltip that appears on hover */}
          <div className="ai-tooltip" style={militaryAssistantStyles.militaryTooltip}>
            <h4 style={militaryAssistantStyles.militaryTooltipHeading}>Military Leave AI Assistant</h4>
            <p style={militaryAssistantStyles.militaryTooltipText}>
              Get specialized assistance with military leave requests and regulations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;