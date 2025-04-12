import React from 'react';
import ReactDOM from 'react-dom'; // Perubahan di sini
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root')); // Perubahan di sini
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="39659027778-ei35k05q2tav3c0kepo5q9f3alhtti46.apps.googleusercontent.com">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

reportWebVitals();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}