import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/ChatBot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  const USER_ID = 'user123'; // Typically from authenticated user data

  // Scroll to the latest message whenever the messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check if the backend server is available when the component mounts
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`);
        console.log('Server connection:', response.data);
      } catch (error) {
        console.error('Server connection error:', error);
        setError('Unable to connect to leave management system. Please try again later.');
      }
    };

    checkServerConnection();
  }, []);

  const sendToDialogflow = async (message) => {
    try {
      const res = await axios.post(`${API_URL}/webhook/dialogflow`, {
        queryResult: {
          queryText: message
        }
      });
  
      const reply = res?.data?.fulfillmentText;
  
      if (reply) {
        const dialogflowMessage = {
          id: Date.now() + 2,
          text: reply,
          sender: 'bot',
          responseData: {
            type: 'dialogflow',
            guidance: reply,
            nextSteps: [],
            contacts: {}
          },
          timestamp: new Date().toISOString()
        };
  
        setMessages((prev) => [...prev, dialogflowMessage]);
      }
    } catch (err) {
      console.error('Error from Dialogflow:', err);
    }
  };
  

  // Handle sending a message to the backend and processing the response
  const sendMessage = async (event) => {
    event.preventDefault();
    if (!inputMessage.trim()) return;
  
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
  
    try {
      const response = await sendWithRetry(() =>
        axios.post(`${API_URL}/webhook`, {
          message: inputMessage,
          userId: USER_ID
        })
      );
  
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

  // Helper function to get message card class based on priority
  const getCardClass = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bot-message bot-message-emergency';
      case 'MEDIUM':
        return 'bot-message bot-message-priority';
      default:
        return 'bot-message';
    }
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

  return (
    <div className="chatbot-container">
      <div className="chat-window">
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={msg.sender === 'user' ? 'user-message' : getCardClass(msg.responseData?.priority)}>
              <p>{msg.text}</p>
              {msg.sender === 'bot' && (
                <>
                  {renderNextSteps(msg.responseData?.nextSteps)}
                  {renderContacts(msg.responseData?.contacts)}
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form className="chat-input" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Type your leave request..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !inputMessage.trim()}>
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
        {error && <div className="chat-error">{error}</div>}
      </div>
    </div>
  );
};

export default ChatBot;
