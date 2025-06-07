import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Yglobal styles
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AuthProvider } from "./context/AuthContext"; // Wrap App with AuthProvider

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Optional: measure performance
reportWebVitals();
