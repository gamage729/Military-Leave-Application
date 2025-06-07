import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import LeaveRequest from "./components/LeaveRequestAI";
import AdminPanel from "./components/AdminPanel";
import News from "./components/News";
import ChatBot from "./components/ChatBot";
import { useAuth } from "./context/AuthContext"; 

// ProtectedRoute component to protect private routes
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Optional: show loading spinner or message while auth status is checked
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave-request-ai"
          element={
            <ProtectedRoute>
              <LeaveRequest activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/news"
          element={
            <ProtectedRoute>
              <News activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chatbot"
          element={
            <ProtectedRoute>
              <ChatBot activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
            </ProtectedRoute>
          }
        />

        {/* Default route redirects to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
