import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import LeaveRequest from "./components/LeaveRequestAI";
import AdminPanel from "./components/AdminPanel";
import News from "./components/News";
import ChatBot from "./components/ChatBot";

function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  return (
    <Router>
      <Routes>
        {/* Public routes (no sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes (with sidebar) */}
        <Route path="/dashboard" element={
          <Dashboard activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        } />
        <Route path="/leave-request-ai" element={
          <LeaveRequest activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        } />
        <Route path="/admin" element={
          <AdminPanel activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        } />
        
        {/* News page route */}
        <Route path="/news" element={
          <News activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        } />
        
        {/* ChatBot page route */}
        <Route path="/chatbot" element={
          <ChatBot activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        } />
        
        {/* Default route */}
        <Route path="*" element={<Dashboard activeMenu={activeMenu} setActiveMenu={setActiveMenu} />} />
      </Routes>
    </Router>
  );
}

export default App;