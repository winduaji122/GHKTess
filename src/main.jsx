import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './tailwind.css' // Tailwind directives
import './index.css'
import 'process';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
