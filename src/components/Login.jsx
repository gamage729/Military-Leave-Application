// Updated Login.jsx
import React, { useState, useContext } from "react";
import { firebaseLogin } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/LoginStyles.css";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../utils/auth"; // Add this import

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await firebaseLogin(email, password);
      console.log("✅ Firebase login response:", res);

      if (!res || !res.uid || !res.token) {
        throw new Error("Invalid response from Firebase.");
      }

      // Use the new authAPI method to store Firebase auth data
      authAPI.storeFirebaseAuth(
        res.uid,
        res.email,
        res.token,
        {
          name: res.displayName || res.email.split('@')[0] || 'User',
          rank: res.rank || '',
          role: res.role || 'soldier'
        }
      );

      // Update auth context
      login(res.token, { 
        uid: res.uid, 
        email: res.email,
        name: res.displayName || res.email.split('@')[0] || 'User'
      });

      console.log("✅ Stored user and token, navigating...");
      
      // Debug storage to verify
      authAPI.debugStorage();
      
      navigate("/dashboard", {
        replace: true,
        state: { fromLogin: true }
      });
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(error.message || "Login failed. Please try again.");
      
      // Clear any partial auth data on failure using authAPI
      authAPI.logout();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="overlay"></div>
      <div className="login-container">
        <h2 className="login-title">Special Force</h2>
        <p className="login-subtitle">Serving Our Country</p>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          {error && <p className="error-message">{error}</p>}
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;