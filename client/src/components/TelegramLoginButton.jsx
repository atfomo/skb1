// client/src/components/TelegramLoginButton.jsx
import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botUsername, onAuth, authUrl }) => {
  const scriptContainerRef = useRef(null); // Ref for the div where the script will inject the button

  useEffect(() => {
    console.log("TelegramLoginButton: useEffect triggered.");
    console.log("TelegramLoginButton: botUsername prop:", botUsername);
    console.log("TelegramLoginButton: authUrl prop:", authUrl);
    
    // Ensure the container div exists
    if (!scriptContainerRef.current) {
      console.error("TelegramLoginButton: Container ref not available at useEffect mount. This is a problem.");
      return;
    }
    console.log("TelegramLoginButton: Container ref is available:", scriptContainerRef.current);


    // Check if the Telegram widget script is already loaded to prevent duplicates
    const existingScript = document.getElementById('telegram-login-widget-script');
    if (existingScript) {
      console.log("TelegramLoginButton: Telegram widget script already exists.");
      // If script exists, ensure the global callback is still pointing correctly
      window.onTelegramAuth = onAuth;
      return;
    }

    console.log("TelegramLoginButton: Creating and appending new Telegram widget script.");
    const script = document.createElement('script');
    script.id = 'telegram-login-widget-script'; // Assign an ID to easily check if it's already there
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large'); // or 'medium', 'small'
    script.setAttribute('data-onauth', 'onTelegramAuth(user)'); // This will call the global window.onTelegramAuth
    script.setAttribute('data-auth-url', authUrl); // Your backend URL
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'false'); // Based on your current HTML

    script.onerror = (e) => { // <-- ADD THIS ERROR HANDLER
      console.error("TelegramLoginButton: Failed to load Telegram widget script!", e);
    };

    script.onload = () => { // <-- ADD THIS LOAD HANDLER
      console.log("TelegramLoginButton: Telegram widget script loaded successfully.");
      // The widget script might need a moment to process the DOM and render the button
      // A small delay or checking the DOM might be needed in complex layouts,
      // but usually the script handles immediate rendering if the container is ready.
    };

    // Append the script to the ref'd div, not to the body
    scriptContainerRef.current.appendChild(script);
    console.log("TelegramLoginButton: Script appended to container:", scriptContainerRef.current);


    // Define the global callback function.
    // This *must* be defined on `window` because the external Telegram script
    // directly calls `window.onTelegramAuth(user)`.
    window.onTelegramAuth = onAuth;
    console.log("TelegramLoginButton: window.onTelegramAuth set.");

    // Cleanup function for when the component unmounts
    return () => {
      console.log("TelegramLoginButton: Cleanup triggered.");
      if (scriptContainerRef.current && scriptContainerRef.current.contains(script)) {
        console.log("TelegramLoginButton: Removing script from container.");
        scriptContainerRef.current.removeChild(script);
      }
      if (window.onTelegramAuth === onAuth) {
         console.log("TelegramLoginButton: Deleting window.onTelegramAuth.");
         delete window.onTelegramAuth;
      }
    };
  }, [botUsername, onAuth, authUrl]); // Re-run effect if these props change

  // This is the div that the script will inject the button into
  // Make sure its ID is unique and not conflicting.
  return (
    <div 
        ref={scriptContainerRef} 
        id="telegram-login-widget-container-unique" // Changed ID to be explicit and avoid potential conflicts
        className="telegram-login-button-wrapper"
    >
      {/* Telegram widget button will be injected here by the script */}
      {/* You can add a placeholder text here that will be replaced by the button */}
      {!scriptContainerRef.current || !scriptContainerRef.current.querySelector('iframe') ? (
          <p>Loading Telegram button...</p>
      ) : null}
    </div>
  );
};

export default TelegramLoginButton;