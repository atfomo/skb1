import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { UserProvider } from './UserContext';
import { DialogProvider } from './context/DialogContext';
import { ThemeProvider } from '@mui/material/styles';
import customTheme from './theme';
import axiosInstance from './utils/axiosInstance';

// --- NEW MOBILE BLOCKING LOGIC ---

const MIN_DESKTOP_WIDTH = 1024; // Define what you consider a "desktop" width (e.g., 1024px or more)

function isMobileDevice() {
    // Check for common mobile user agent keywords
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /Mobi|Android|iPhone|iPad|Windows Phone|BlackBerry|Opera Mini|Mobile|webOS|NokiaBrowser|UCBrowser/i.test(userAgent);

    // Check screen width (a tablet in landscape might be > 768px, so MIN_DESKTOP_WIDTH is safer for "desktop-only")
    const isSmallScreen = window.innerWidth < MIN_DESKTOP_WIDTH;
    const isTallScreen = window.innerHeight > window.innerWidth; // Likely a phone in portrait

    // Combine checks: consider it mobile if UA indicates mobile OR if it's a small screen that's also tall (typical phone)
    // You might adjust this logic based on your exact definition of "mobile" vs "tablet"
    return isMobileUA || isSmallScreen;
    // return isMobileUA || (isSmallScreen && isTallScreen); // More strict for phones only
}

// Function to display the unsupported message
function displayUnsupportedMessage() {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        rootElement.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background-color: #f0f2f5;
                color: #333;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
                box-sizing: border-box;
            ">
                <h1 style="color: #d32f2f; margin-bottom: 20px;">Device Not Supported</h1>
                <p style="font-size: 1.1em; line-height: 1.6;">
                    We apologize, but this website is currently optimized only for desktop use.
                    Please access the site from a laptop or desktop computer for the best experience.
                </p>
                <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                    Thank you for your understanding.
                </p>
            </div>
        `;
    }
}

if (isMobileDevice()) {
    displayUnsupportedMessage();
    // Optionally, prevent further script execution or set up a listener for resize
    // If the user resizes to desktop size, you could reload or show the app
    window.addEventListener('resize', () => {
        if (!isMobileDevice()) {
            window.location.reload(); // Reload the page if they resize to desktop
        }
    });
} else {
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
}