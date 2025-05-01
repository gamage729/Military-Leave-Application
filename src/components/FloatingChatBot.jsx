import React, { useState, useEffect, useRef } from 'react';
import '../styles/FloatingChatBotStyles.css';

const FloatingChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const botRef = useRef(null);

  // Handle drag start
  const handleMouseDown = (e) => {
    // Prevent default behavior and propagation
    e.preventDefault();
    e.stopPropagation();
    
    if (botRef.current) {
      const rect = botRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Handle dragging
  const handleMouseMove = (e) => {
    if (isDragging) {
      // Calculate new position based on mouse position and drag offset
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep the bot within the viewport
      const maxX = window.innerWidth - 60; // 60px is approx width of bot icon
      const maxY = window.innerHeight - 60; // 60px is approx height of bot icon
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    if (isDragging) {
      // Save the current position to localStorage
      localStorage.setItem('chatBotPosition', JSON.stringify(position));
    }
    setIsDragging(false);
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  // Set initial position only when component first mounts, and adjust on window resize
  useEffect(() => {
    // We'll use this flag to only set the position on first mount
    const isFirstMount = !localStorage.getItem('chatBotPosition');
    
    const handleResize = () => {
      // Get the current position from localStorage or use default
      let storedPosition = localStorage.getItem('chatBotPosition');
      let currentPosition;
      
      if (storedPosition) {
        try {
          currentPosition = JSON.parse(storedPosition);
        } catch (e) {
          currentPosition = null;
        }
      }
      
      // If it's the first mount or no valid stored position, use default position
      if (isFirstMount || !currentPosition) {
        const defaultPosition = { 
          x: window.innerWidth - 80, 
          y: window.innerHeight - 100 
        };
        setPosition(defaultPosition);
        localStorage.setItem('chatBotPosition', JSON.stringify(defaultPosition));
      } else {
        // Make sure the position is still within viewport after resize
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        
        const adjustedPosition = {
          x: Math.min(currentPosition.x, maxX),
          y: Math.min(currentPosition.y, maxY)
        };
        
        setPosition(adjustedPosition);
        localStorage.setItem('chatBotPosition', JSON.stringify(adjustedPosition));
      }
    };

    // Set position on first mount
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Toggle chat widget open/closed
  const toggleChat = (e) => {
    // Make sure we don't toggle when dragging
    if (!isDragging) {
      setIsOpen(!isOpen);
    }
  };

  // Redirect to chatbot page
  const openChatbot = () => {
    // Replace '/chatbot' with your actual chatbot URL
    window.location.href = '/chatbot';
    // Alternatively, you could open in a new tab:
    // window.open('/chatbot', '_blank');
  };

  // Apply the classes to get the CSS styles to take effect
  const containerClasses = `floating-chatbot-container ${isDragging ? 'dragging' : ''}`;
  const buttonClasses = `chat-bot-button ${isOpen ? 'open' : ''}`;

  return (
    <div 
      className={containerClasses}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'all 0.3s ease'
      }}
      ref={botRef}
    >
      {/* Chat button */}
      <div 
        className={buttonClasses}
        onMouseDown={handleMouseDown}
        onClick={toggleChat}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: isOpen ? '#2d4da1' : '#3e6ae1',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {isOpen ? (
            // X icon when open
            <>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </>
          ) : (
            // Chat icon when closed
            <>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="10" r="1"></circle>
              <circle cx="8" cy="10" r="1"></circle>
              <circle cx="16" cy="10" r="1"></circle>
            </>
          )}
        </svg>
      </div>

      {/* Chat popup */}
      {isOpen && (
        <div 
          className="chat-popup"
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            width: '300px',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            pointerEvents: 'all'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent clicks in popup from affecting button
        >
          <div 
            className="chat-header"
            style={{
              padding: '15px',
              backgroundColor: '#3e6ae1',
              color: 'white',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>Help Center</span>
          </div>
          <div 
            className="chat-content"
            style={{
              padding: '15px',
              height: '200px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>Need assistance?</h3>
            <p style={{ margin: '0 0 20px 0' }}>Our virtual assistant is here to help you with your leave management inquiries.</p>
            <button 
              onClick={openChatbot}
              style={{
                padding: '10px 15px',
                backgroundColor: '#3e6ae1',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'background-color 0.3s'
              }}
            >
              Start Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatBot;