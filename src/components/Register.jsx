// Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RegisterStyles.css";
import { db } from "../firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    rank: "Private",
    role: "soldier",
    firstName: "",
    lastName: "",
    unit: "",
    phoneNumber: "",
    dateOfBirth: "",
  });
  const [regNumber, setRegNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [regNumberError, setRegNumberError] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { register } = useAuth();

  const validateForm = () => {
    setError("");
    
    if (!form.name.trim()) {
      setError("Please enter your name");
      return false;
    }
    
    if (!form.email.trim()) {
      setError("Please enter your email");
      return false;
    }
    
    if (!form.password.trim()) {
      setError("Please enter a password");
      return false;
    }
    
    if (!regNumber.trim()) {
      setError("Please enter your regimental number");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
      return false;
    }
    
    return true;
  };

  const validateRegNumber = async (number) => {
    setRegNumberError("");
    if (!number?.trim()) {
      setRegNumberError("Please enter a regimental number");
      return false;
    }

    try {
      const docRef = doc(db, "soldiers", number.trim());
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setRegNumberError("Soldier ID not found in system");
        return false;
      }
      
      const soldierData = docSnap.data();
      
      if (soldierData.registered) {
        setRegNumberError("This soldier ID is already registered");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Validation error:", error);
      setRegNumberError("System error validating ID. Please try again.");
      return false;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm() || !await validateRegNumber(regNumber)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get soldier data
      const soldierDoc = await getDoc(doc(db, 'soldiers', regNumber));
      if (!soldierDoc.exists()) {
        throw new Error('Soldier record not found');
      }

      const existingData = soldierDoc.data();
      const userData = {
        name: form.name,
        firstName: form.firstName || form.name.split(' ')[0] || form.name,
        lastName: form.lastName || form.name.split(' ').slice(1).join(' ') || '',
        rank: form.rank,
        unit: form.unit || existingData.unit || '',
        phoneNumber: form.phoneNumber || existingData.phoneNumber || '',
        dateOfBirth: form.dateOfBirth || existingData.dateOfBirth || '',
        role: form.role,
        regNumber,
        soldierId: regNumber,
        ...existingData
      };

      // Use AuthContext register function
      await register(form.email, form.password, userData);
      
      // Redirect after successful registration
      navigate('/dashboard', { 
        state: { message: 'Registration successful!' }
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
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
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Enter Regimental Number (e.g., 901234)"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            onBlur={() => regNumber && validateRegNumber(regNumber)}
            required
            disabled={loading}
          />
          {regNumberError && <div className="error-message">{regNumberError}</div>}
          
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
            title="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
          />

          <div className="dropdown-container">
            <label htmlFor="rank">Select Your Rank</label>
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

            <label htmlFor="role">Select Your Role</label>
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

          <button type="submit" disabled={loading || regNumberError}>
            {loading ? "Creating Account..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;