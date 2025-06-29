import React from 'react';
import ReactDOM from 'react-dom/client';
// You already have BrowserRouter in App.js, so no need to import it here.
import App from './App';
import './index.css'; // Your global CSS
import { UserProvider } from './UserContext'; // Your UserProvider
import { DialogProvider } from './context/DialogContext';
import { ThemeProvider } from '@mui/material/styles';
import customTheme from './theme';

import axios from 'axios'; // ⭐ IMPORTANT: Import axios here ⭐
import { API_BASE_URL } from './config'; // ⭐ Import API_BASE_URL from your config ⭐

// ⭐ 1. Set the global base URL for Axios ⭐
// This tells Axios to prefix all relative URLs (like '/api/spark-campaigns/...')
// with your backend's full URL.
axios.defaults.baseURL = API_BASE_URL; // Using API_BASE_URL from your config

// ⭐ 2. Ensure credentials (like cookies) are sent for cross-origin requests ⭐
// This is important if your backend sets HTTP-only cookies or relies on session.
axios.defaults.withCredentials = true;

// ⭐ 3. CRITICAL: Add an Axios request interceptor to attach JWT token ⭐
// This interceptor runs BEFORE every HTTP request made by Axios.
// It retrieves your JWT from localStorage and adds it to the Authorization header.
axios.interceptors.request.use(
  (config) => {
    // Get the token from localStorage. Your UserContext uses 'jwtToken'.
    const token = localStorage.getItem('jwtToken'); 
    console.log('[Axios Interceptor] Checking for token:', token ? 'Found' : 'Not Found');

    // Only add Authorization header if a token exists
    if (token) {
      // Add it as a Bearer token in the Authorization header.
      // This is the standard way to send JWTs and what your backend's authenticateJWT middleware expects.
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Axios Interceptor] Authorization header added.');
    } else {
      console.log('[Axios Interceptor] No token found in localStorage for this request.');
    }
    return config; // Always return the modified config (or original if no token)
  },
  (error) => {
    // Handle errors that occur before the request is sent (e.g., network issues)
    console.error('[Axios Interceptor] Request error:', error);
    return Promise.reject(error);
  }
);

// ⭐ 4. Optional: Add an Axios response interceptor for global error handling (e.g., 401/403) ⭐
// This is good for logging out users automatically if their token becomes invalid/expired.
axios.interceptors.response.use(
  (response) => response, // Just pass through successful responses
  (error) => {
    console.error('[Axios Interceptor] Response error:', error);
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        console.warn('[Axios Interceptor] Unauthorized or Forbidden response detected.');
        // Prevent infinite redirect loops for login/register
        if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
          console.log('Clearing token and considering redirect to login...');
          localStorage.removeItem('jwtToken'); // Clear the invalid token
          // window.location.href = '/login'; // Uncomment this to force a full page reload and redirect to login
        }
      }
    } else if (error.request) {
      // The request was made but no response was received (e.g., network down)
      console.error('[Axios Interceptor] No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('[Axios Interceptor] Error setting up request:', error.message);
    }
    return Promise.reject(error); // Re-throw the error so it can be caught by individual components
  }
);


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={customTheme}>
      <UserProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
