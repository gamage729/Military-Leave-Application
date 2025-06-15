import React, { useState } from "react";
import { firebaseRegister } from "../services/firebase-auth";
import { useNavigate } from "react-router-dom";
import "../styles/RegisterStyles.css";
import { db } from "../firebase-config";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
  const [regNumberError, setRegNumberError] = useState("");
  const navigate = useNavigate();

  const validateRegNumber = async (number) => {
    setRegNumberError("");
    if (!number || !number.trim()) {
      setRegNumberError("Please enter a regimental number");
      return false;
    }

    try {
      console.log("Validating reg number:", number);
      const docRef = doc(db, "soldiers", number.trim());
      console.log("Document reference created");
      
      const docSnap = await getDoc(docRef);
      console.log("Document snapshot received:", docSnap.exists());
      
      if (!docSnap.exists()) {
        setRegNumberError("Soldier ID not found in system");
        return false;
      }
      
      const soldierData = docSnap.data();
      console.log("Soldier data:", soldierData);
      
      if (soldierData.registered) {
        setRegNumberError("This soldier ID is already registered");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Validation error details:", error);
      setRegNumberError("System error validating ID. Please try again.");
      return false;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRegNumberError("");

    try {
      console.log("Starting registration for:", regNumber);
      
      // Validate regimental number
      if (!await validateRegNumber(regNumber)) {
        throw new Error(regNumberError);
      }

      // Register with Firebase Auth
      const firebaseResponse = await firebaseRegister({
        email: form.email,
        password: form.password,
        name: form.name,
        rank: form.rank,
        role: form.role,
      });
      console.log("Firebase registration successful");

      // Update soldier record
      await setDoc(
        doc(db, "soldiers", regNumber.trim()),
        {
          registered: true,
          registeredAt: new Date().toISOString(),
          email: form.email,
          name: form.name,
          rank: form.rank,
          role: form.role
        },
        { merge: true }
      );
      console.log("Soldier record updated");

      alert("Registration successful! Please login.");
      navigate("/login");
      
    } catch (error) {
      console.error("Registration failed:", error);
      setRegNumberError(error.message);
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
            placeholder="Enter Regimental Number (e.g., 901234)"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            onBlur={() => validateRegNumber(regNumber)}
            required
            disabled={loading}
          />
          {regNumberError && (
            <div className="error-message" style={{ color: 'red', margin: '5px 0' }}>
              {regNumberError}
            </div>
          )}
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