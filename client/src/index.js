
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { UserProvider } from './UserContext';
import { DialogProvider } from './context/DialogContext';
import { ThemeProvider } from '@mui/material/styles';
import customTheme from './theme';
import axiosInstance from './utils/axiosInstance'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={customTheme}>
      <UserProvider> {}
        <DialogProvider>
          <App />
        </DialogProvider>
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>,
);