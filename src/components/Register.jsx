import React, { useState } from "react";
import { firebaseRegister } from "../services/firebase-auth";
import { useNavigate } from "react-router-dom";
import "../styles/RegisterStyles.css";
import axios from "axios";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    rank: "Private",
    role: "soldier",
  });
  const [regNumber, setRegNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Debug function to test the token
  const debugToken = async (accessToken) => {
    try {
      console.log('🔍 Debug: Testing token with backend...');
      const response = await axios.post(
        "http://localhost:5001/auth/test-token",
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✅ Token test successful:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Token test failed:', error.response?.data || error.message);
      return false;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Register with Firebase Auth
      console.log("🚀 Starting Firebase registration...");
      const firebaseResponse = await firebaseRegister({
        email: form.email,
        password: form.password,
        name: form.name,
        rank: form.rank,
        role: form.role,
      });

      console.log("✅ Firebase registration response:", firebaseResponse);

      // Step 2: Get the ID token from Firebase response
      const { accessToken } = firebaseResponse.data;
      
      if (!accessToken) {
        throw new Error('No access token received from Firebase registration');
      }
      
      console.log("✅ Got ID token from Firebase");
      console.log("🔍 Token length:", accessToken.length);
      console.log("🔍 Token starts with:", accessToken.substring(0, 50) + "...");
      
      // Step 2.5: Debug the token (commented out until server is updated)
      // console.log("🔍 Testing token with backend...");
      // const tokenIsValid = await debugToken(accessToken);
      // 
      // if (!tokenIsValid) {
      //   throw new Error('Token validation failed - check console for details');
      // }
      
      // Step 3: Prepare backend payload
      const backendPayload = {
        email: form.email,
        name: form.name,
        soldierId: regNumber,
        rank: form.rank,
        role: form.role,
      };
      
      console.log("📦 Backend payload:", backendPayload);
      console.log("🔑 Authorization header:", `Bearer ${accessToken.substring(0, 20)}...`);
      
      // Step 4: Send registration data to backend
      console.log("🚀 Sending registration to backend...");
      const backendResponse = await axios.post(
        "http://localhost:5001/auth/register",
        backendPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log("✅ Registration successful:", backendResponse.data);
      alert("Registration successful!");
      navigate("/login");
      
    } catch (error) {
      console.error("❌ Registration error:", error);
      
      // Better error handling with more specific messages
      let errorMessage = "Registration failed";
      
      if (error.response) {
        // Backend returned an error
        console.log("❌ Backend error response:", error.response.data);
        console.log("❌ Full error response:", error.response);
        
        // Show more detailed error information
        const backendError = error.response.data;
        console.log("❌ Backend error object:", JSON.stringify(backendError, null, 2));
        
        if (backendError.details) {
          errorMessage = `${backendError.error}: ${backendError.details}`;
        } else {
          errorMessage = backendError.error || 
                        backendError.message || 
                        `Server error: ${error.response.status}`;
        }
        
        // If it's a token-related error, provide more guidance
        if (backendError.error?.includes('token') || 
            backendError.details?.includes('token') ||
            backendError.details?.includes('uid')) {
          errorMessage += "\n\nThis appears to be a token issue. Check the browser console for more details.";
        }
        
      } else if (error.request) {
        // Network error
        errorMessage = "Network error. Please check your connection.";
      } else {
        // Firebase or other error
        errorMessage = error.message || "Registration failed";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="overlay"></div>
      <div className="register-form">
        <h2>Create Your Account</h2>
        <p>Serving Our Country</p>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Enter Regimental Number"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Your e-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Create password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={loading}
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
            title="Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
          />

          <div className="dropdown-container">
            <label htmlFor="rank" className="dropdown-label">
              Select Your Rank
            </label>
            <select
              id="rank"
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: e.target.value })}
              required
              disabled={loading}
            >
              <option value="Private">Private</option>
              <option value="Sergeant">Sergeant</option>
              <option value="Lieutenant">Lieutenant</option>
              <option value="Captain">Captain</option>
              <option value="Major">Major</option>
            </select>

            <label htmlFor="role" className="dropdown-label">
              Select Your Role
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
              disabled={loading}
            >
              <option value="soldier">Soldier</option>
              <option value="officer">Officer</option>
            </select>
          </div>

          <button type="submit" className="create-account" disabled={loading}>
            {loading ? "Creating Account..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;