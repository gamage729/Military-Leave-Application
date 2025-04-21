import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // Make sure your styles are imported correctly
import App from './App';  // Use default import
import reportWebVitals from './reportWebVitals';  // Keep this if you want to measure performance


// Render the App component into the root div
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: If you want to start measuring performance, you can pass a function
// to log results or send to an analytics endpoint.
reportWebVitals();
