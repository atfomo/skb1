// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { UserProvider } from './UserContext';
import { DialogProvider } from './context/DialogContext';
import { ThemeProvider } from '@mui/material/styles';
import customTheme from './theme';

// Import your custom axios instance (DO NOT import global axios directly here)
import axiosInstance from './utils/axiosInstance'; 

// No need to set axios.defaults.baseURL here anymore.
// No need for global axios interceptors here anymore.
// The setup is now encapsulated in axiosInstance and called by UserProvider.


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={customTheme}>
      <UserProvider> {/* UserProvider will set up the interceptors */}
        <DialogProvider>
          <App />
        </DialogProvider>
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>,
);