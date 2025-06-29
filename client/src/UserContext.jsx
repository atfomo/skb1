// client/src/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // Keep for initial checks, but don't rely solely on it for user state
import { API_BASE_URL } from './config';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    // State for the raw JWT token from localStorage
    const [token, setToken] = useState(() => localStorage.getItem('jwtToken'));

    // State for the full user object, initialized to null or basic data
    // We will populate this fully via fetchUserData
    const [user, setUser] = useState(null);

    // Initial loading state - crucial for showing a loading spinner or delaying rendering
    const [loadingUser, setLoadingUser] = useState(true);
    const [hasDashboard, setHasDashboard] = useState(false);

    // Derived state: isAuthenticated based on user object presence
    const isAuthenticated = !!user;

    const logout = useCallback(() => {
        console.log('UserContext: Initiating logout...');
        setToken(null);
        setUser(null);
        setHasDashboard(false);
        localStorage.removeItem('jwtToken');
        console.log('UserContext: Logout complete. Token and user state cleared.');
        // No need to set setLoadingUser(false) here, it will be handled by the useEffect.
        // If it was already true when logout is called, it means fetchUserData failed,
        // and fetchUserData's finally block will set it to false.
    }, []); // No dependencies for logout

    const fetchUserData = useCallback(async (authToken) => {
        setLoadingUser(true); // Always set loading to true when fetching data
        console.log('UserContext: fetchUserData called. AuthToken:', authToken ? 'Present' : 'Absent');

        if (!authToken) {
            console.log('UserContext: No authToken provided for fetchUserData. Resetting user state.');
            setUser(null);
            setHasDashboard(false);
            setLoadingUser(false); // Finished loading (nothing to fetch)
            return;
        }

        // Optional: Pre-decode to check for immediate expiration before API call (optimistic check)
        try {
            const decoded = jwtDecode(authToken);
            if (decoded.exp * 1000 < Date.now()) {
                console.warn('UserContext: JWT found in localStorage is already expired locally. Initiating logout.');
                logout();
                return;
            }
        } catch (decodeError) {
            console.error('UserContext: Failed to decode stored JWT (malformed). Initiating logout.', decodeError);
            logout();
            return;
        }


        try {
            const config = { headers: { 'Authorization': `Bearer ${authToken}` } };

            console.log('UserContext: Attempting to fetch user data from /auth/me...');
            const userRes = await axios.get(`${API_BASE_URL}/auth/me`, config);
            console.log('UserContext: User data fetched successfully from /auth/me:', userRes.data);

            // Set full user data from backend response
            setUser(userRes.data);

            console.log('UserContext: Attempting to fetch dashboard status from /api/project/creator-dashboard-status...');
            const dashboardStatusRes = await axios.get(`${API_BASE_URL}/api/project/creator-dashboard-status`, config);
            console.log('UserContext: Dashboard status fetched successfully:', dashboardStatusRes.data);
            setHasDashboard(dashboardStatusRes.data.hasDashboard);

        } catch (error) {
            console.error('UserContext: Failed to fetch user data or dashboard status:', error.response?.data?.message || error.message);
            // Handle 401 (Unauthorized) or 403 (Forbidden) specifically
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.log('UserContext: Server responded with 401/403. Token invalid/expired or unauthorized. Calling logout()...');
                logout();
            } else {
                // For other errors (e.g., network error, 500 server error)
                console.log('UserContext: Non-authentication error or server issue. Clearing user/token states locally and logging out.');
                logout(); // Logout to ensure consistency, better safe than sorry
            }
        } finally {
            setLoadingUser(false); // Always set loading to false when fetch is complete
            console.log('UserContext: fetchUserData finished.');
        }
    }, [logout]); // logout is a dependency but it's memoized with useCallback

    // This useEffect runs once on mount, and whenever `token` state changes
    useEffect(() => {
        console.log('UserContext: Main useEffect (token/initial load) triggered. Current token state:', token ? 'PRESENT' : 'ABSENT');
        if (token) {
            // If token exists, attempt to fetch user data
            fetchUserData(token);
        } else {
            // If no token, or token was just cleared by logout(), ensure states are reset
            setUser(null);
            setHasDashboard(false);
            setLoadingUser(false); // No token, so no loading needed
        }
    }, [token, fetchUserData]); // fetchUserData is a dependency

    // `login` function to be called from your login component
    const login = useCallback((jwtToken) => {
        console.log('UserContext: login called from external component. Setting token...');
        localStorage.setItem('jwtToken', jwtToken);
        console.log('UserContext: Token SET in localStorage. Verification:', localStorage.getItem('jwtToken') ? 'SUCCESS' : 'FAILED');

        setToken(jwtToken); // Update token state, which will trigger the useEffect to fetch user data
        // Do NOT set user directly here. Let fetchUserData populate the user state from the backend
        // This ensures user data is always fresh from the authoritative source.
        setLoadingUser(true); // Indicate loading while fetchUserData runs
    }, []);

    // Handles changes to localStorage from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'jwtToken') {
                const storedToken = localStorage.getItem('jwtToken');
                if (storedToken !== token) {
                    console.log('UserContext: localStorage "jwtToken" changed externally. Updating token state.');
                    setToken(storedToken); // This will trigger the main useEffect
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [token]);

    const contextValue = {
        user,
        loadingUser, // Important for components to know when data is ready
        token,
        isAuthenticated,
        hasDashboard,
        logout,
        login,
        refetchUserData: fetchUserData, // Expose to allow manual refetch if needed
        // setUser is generally not exposed, as login/logout/fetchUserData manage it
    };

    return (
        <UserContext.Provider value={contextValue}>
            {/* Render children only when loadingUser is false, or render a loading indicator */}
            {loadingUser ? <div>Loading user data...</div> : children}
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