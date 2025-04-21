import React, { useState } from "react";
import { register } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/RegisterStyles.css";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    rank: "Private", // Default rank
    role: "soldier", // Default role
  });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await register(form);
      console.log("Registration success:", response.data);
      alert("Registration successful!");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error.response ? error.response.data : error.message);
      alert(error.response?.data?.error || "Registration failed!");
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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Your e-mail"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Create password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
            title="Password must be at least 8 characters long, include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
          />

      <div className="dropdown-container">
      <label className="dropdown-label">Select Your Rank</label>
      <select
        value={form.rank}
        onChange={(e) => setForm({ ...form, rank: e.target.value })}
        required
      >
        <option value="Private">Private</option>
        <option value="Sergeant">Sergeant</option>
        <option value="Lieutenant">Lieutenant</option>
        <option value="Captain">Captain</option>
        <option value="Major">Major</option>
      </select>

      <label className="dropdown-label">Select Your Role</label>
      <select
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
        required
      >
       <option value="soldier">Soldier</option>
     <option value="officer">Officer</option>
       </select>
     </div>



          <button type="submit" className="create-account">Create account</button>
        </form>
      </div>
    </div>
  );
};
export default Register;
