import React, { useState } from "react";
import { register } from "../services/api";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [form, setForm] = useState({ name: "", rank: "", role: "soldier", email: "", password: "" });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      alert("Registration successful!");
      navigate("/login");
    } catch (error) {
      alert("Registration failed!");
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="text" placeholder="Rank" onChange={(e) => setForm({ ...form, rank: e.target.value })} required />
        <select onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="soldier">Soldier</option>
          <option value="admin">Admin</option>
        </select>
        <input type="email" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
