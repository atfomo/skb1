// src/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axiosInstance, { setupAxiosInterceptors } from './utils/axiosInstance'; // Correct path to your new file


const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('jwtToken'));
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [hasDashboard, setHasDashboard] = useState(false);

    const isAuthenticated = !!user;

    const logout = useCallback(() => {
        console.log('UserContext: Initiating logout...');
        setToken(null); // Clear token from state
        setUser(null);
        setHasDashboard(false);
        localStorage.removeItem('jwtToken'); // Clear token from localStorage
        console.log('UserContext: Logout complete. Token and user state cleared.');
    }, []);

    // fetchUserData now uses the 'token' from state if no authToken is provided
    const fetchUserData = useCallback(async (explicitAuthToken) => {
        setLoadingUser(true);
        // Use explicitAuthToken if provided, otherwise fall back to the token from state
        const currentToken = explicitAuthToken || token; 

        console.log('UserContext: fetchUserData called. AuthToken:', currentToken ? 'Present' : 'Absent');

        if (!currentToken) {
            console.log('UserContext: No currentToken available for fetchUserData. Resetting user state.');
            setUser(null);
            setHasDashboard(false);
            setLoadingUser(false);
            return;
        }

        try {
            const decoded = jwtDecode(currentToken);
            if (decoded.exp * 1000 < Date.now()) {
                console.warn('UserContext: JWT found is expired locally. Initiating logout.');
                logout();
                return;
            }
        } catch (decodeError) {
            console.error('UserContext: Failed to decode JWT (malformed). Initiating logout.', decodeError);
            logout();
            return;
        }

        try {
            // axiosInstance already handles Authorization header, so no need to pass it here manually
            console.log('UserContext: Attempting to fetch user data from /auth/me...');
            const userRes = await axiosInstance.get('/auth/me'); 
            console.log('UserContext: User data fetched successfully from /auth/me:', userRes.data);

            setUser(userRes.data);

            console.log('UserContext: Attempting to fetch dashboard status from /api/project/creator-dashboard-status...');
            const dashboardStatusRes = await axiosInstance.get('/api/project/creator-dashboard-status');
            console.log('UserContext: Dashboard status fetched successfully:', dashboardStatusRes.data);
            setHasDashboard(dashboardStatusRes.data.hasDashboard);

        } catch (error) {
            console.error('UserContext: Failed to fetch user data or dashboard status:', error.response?.data?.message || error.message);
            // The axios interceptor configured via setupAxiosInterceptors will handle 401/403 errors.
            // If the error is not 401/403 (e.g., network error, 500), you might still want to log out.
            if (!error.response || (error.response.status !== 401 && error.response.status !== 403)) {
                 console.log('UserContext: Non-authentication error during fetch. Clearing user/token states locally.');
                 logout(); // Still log out for other severe fetch errors
            }
        } finally {
            setLoadingUser(false);
            console.log('UserContext: fetchUserData finished.');
        }
    }, [logout, token]); // Add 'token' as a dependency for fetchUserData

    // This useEffect will run once when the provider mounts to set up the interceptors
    useEffect(() => {
        console.log('UserContext: Setting up Axios interceptors.');
        setupAxiosInterceptors(logout); // Pass the logout function
    }, [logout]); 

    useEffect(() => {
        console.log('UserContext: Main useEffect (token/initial load) triggered. Current token state:', token ? 'PRESENT' : 'ABSENT');
        if (token) {
            // On initial load or token state change, fetch user data using the token from state
            fetchUserData(token); 
        } else {
            setUser(null);
            setHasDashboard(false);
            setLoadingUser(false);
        }
    }, [token, fetchUserData]); // Depend on token and fetchUserData

    const login = useCallback((jwtToken) => {
        console.log('UserContext: login called from external component. Setting token...');
        localStorage.setItem('jwtToken', jwtToken);
        console.log('UserContext: Token SET in localStorage. Verification:', localStorage.getItem('jwtToken') ? 'SUCCESS' : 'FAILED');
        setToken(jwtToken); // Update the state, which triggers the main useEffect
        setLoadingUser(true); // Set loading to true while new data is fetched
    }, []);

    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'jwtToken') {
                const storedToken = localStorage.getItem('jwtToken');
                if (storedToken !== token) {
                    console.log('UserContext: localStorage "jwtToken" changed externally. Updating token state.');
                    setToken(storedToken);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [token]);

    const contextValue = {
        user,
        loadingUser,
        token,
        isAuthenticated,
        hasDashboard,
        logout,
        login,
        refetchUserData: () => fetchUserData(token), // Ensure refetchUserData explicitly passes the current token
    };

    return (
        <UserContext.Provider value={contextValue}>
            {loadingUser ? <div className="loading-container"><FaSpinner className="loading-spinner" /> <p>Loading user data...</p></div> : children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === null) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};