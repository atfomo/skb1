
import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botUsername, onAuth, authUrl }) => {
  const scriptContainerRef = useRef(null); // Ref for the div where the script will inject the button

  useEffect(() => {
    
    
    
    

    if (!scriptContainerRef.current) {
      console.error("TelegramLoginButton: Container ref not available at useEffect mount. This is a problem.");
      return;
    }
    



    const existingScript = document.getElementById('telegram-login-widget-script');
    if (existingScript) {
      

      window.onTelegramAuth = onAuth;
      return;
    }

    
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
      



    };


    scriptContainerRef.current.appendChild(script);
    





    window.onTelegramAuth = onAuth;
    


    return () => {
      
      if (scriptContainerRef.current && scriptContainerRef.current.contains(script)) {
        
        scriptContainerRef.current.removeChild(script);
      }
      if (window.onTelegramAuth === onAuth) {
         
         delete window.onTelegramAuth;
      }
    };
  }, [botUsername, onAuth, authUrl]); // Re-run effect if these props change



  return (
    <div 
        ref={scriptContainerRef} 
        id="telegram-login-widget-container-unique" // Changed ID to be explicit and avoid potential conflicts
        className="telegram-login-button-wrapper"
    >
      {}
      {}
      {!scriptContainerRef.current || !scriptContainerRef.current.querySelector('iframe') ? (
          <p>Loading Telegram button...</p>
      ) : null}
    </div>
  );
};

export default TelegramLoginButton;