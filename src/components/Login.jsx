import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/LoginStyles.css";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading: authLoading } = useAuth();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      if (location.state?.email) {
        setForm(prev => ({ ...prev, email: location.state.email }));
      }
      
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(form.email, form.password);
      // Navigation is handled by protected routes
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.code === 'auth/wrong-password' ? 'Invalid credentials' :
        error.code === 'auth/user-not-found' ? 'User not found' :
        error.code === 'auth/too-many-requests' ? 'Account temporarily locked' :
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Welcome Back</h2>
        <p>Sign in to your account</p>
        
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Your email"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            required
            disabled={loading}
            autoComplete="email"
          />
          
          <input
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/register">Create new account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;