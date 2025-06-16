// App.js
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import News from "./components/News";
import ChatBot from "./components/ChatBot";
import LeaveRequestAI from "./components/LeaveRequestAI";

function App() {
  const { user, loading, registrationComplete } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  const isAuthenticated = !!user;
  const isFullyRegistered = isAuthenticated && registrationComplete;

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to={isFullyRegistered ? "/dashboard" : "/register"} replace />
            ) : (
              <Login />
            )
          } 
        />
        
        <Route 
          path="/register" 
          element={<Register />}  // No conditions - always show register page
        />
        
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/news" element={<News />} />
        <Route path="/chatbot" element={<ChatBot />} />
        <Route path="/leave-request-ai" element={<LeaveRequestAI />} />
        
        <Route 
          path="/" 
          element={
            <Navigate to={isFullyRegistered ? "/dashboard" : isAuthenticated ? "/register" : "/login"} replace />
          } 
        />
        
        <Route 
          path="*" 
          element={
            <Navigate to={isFullyRegistered ? "/dashboard" : isAuthenticated ? "/register" : "/login"} replace />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;