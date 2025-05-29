import React, { useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../styles/RegisterStyles.css";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    rank: "", 
    role: "", 
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      
      const user = userCredential.user;

      // Store additional user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: form.name,
        email: form.email,
        rank: form.rank,
        role: form.role,
        createdAt: new Date().toISOString(),
      });

      // Sign out the user after registration
      await signOut(auth);

      toast.success('Account created successfully! Please login with your credentials.', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        onClose: () => navigate("/login", { replace: true }),
      });
      
      // Clear the form
      setForm({
        name: "",
        email: "",
        password: "",
        rank: "",
        role: "",
      });
    } catch (error) {
      let errorMessage = "";
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "An account already exists with this email.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address.";
            break;
          case 'auth/operation-not-allowed':
            errorMessage = "Email/password accounts are not enabled.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. Please use a stronger password.";
            break;
          case 'permission-denied':
            errorMessage = "You don't have permission to create this account. Please contact support.";
            break;
          default:
            errorMessage = "An error occurred during registration. Please try again.";
        }
      } else if (error.message) {
        // Handle Firestore errors
        if (error.message.includes('transport')) {
          errorMessage = "Network error occurred. Please check your internet connection and try again.";
        } else {
          errorMessage = "Failed to save user data. Please try again.";
        }
      } else {
        errorMessage = "An unexpected error occurred. Please try again.";
      }
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <ToastContainer />
      <div className="overlay"></div>
      <div className="register-form">
        <h2>Create Your Account</h2>
        <p>Serving Our Country</p>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={isLoading}
          />
          <input
            type="email"
            placeholder="Your e-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={isLoading}
          />
          <input
            type="password"
            placeholder="Create password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={isLoading}
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
            title="Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
          />

          <div className="dropdown-container">
            {/* Rank Dropdown */}
            <select
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: e.target.value })}
              required
              disabled={isLoading}
            >
              <option value="" disabled>Select Your Rank</option>
              <option value="Private">Private</option>
              <option value="Sergeant">Sergeant</option>
              <option value="Lieutenant">Lieutenant</option>
              <option value="Captain">Captain</option>
              <option value="Major">Major</option>
            </select>

            {/* Role Dropdown */}
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
              disabled={isLoading}
            >
              <option value="" disabled>Select Your Role</option>
              <option value="soldier">Soldier</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="create-account"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Register;
