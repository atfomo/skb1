// src/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from './config';
// Import the new axiosInstance and setup function
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
        setToken(null);
        setUser(null);
        setHasDashboard(false);
        localStorage.removeItem('jwtToken');
        console.log('UserContext: Logout complete. Token and user state cleared.');
    }, []);

    const fetchUserData = useCallback(async (authToken) => {
        setLoadingUser(true);
        console.log('UserContext: fetchUserData called. AuthToken:', authToken ? 'Present' : 'Absent');

        if (!authToken) {
            console.log('UserContext: No authToken provided for fetchUserData. Resetting user state.');
            setUser(null);
            setHasDashboard(false);
            setLoadingUser(false);
            return;
        }

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
            // Use axiosInstance instead of global axios
            const userRes = await axiosInstance.get(`${API_BASE_URL}/auth/me`, config);
            console.log('UserContext: User data fetched successfully from /auth/me:', userRes.data);

            setUser(userRes.data);

            console.log('UserContext: Attempting to fetch dashboard status from /api/project/creator-dashboard-status...');
            // Use axiosInstance instead of global axios
            const dashboardStatusRes = await axiosInstance.get(`${API_BASE_URL}/api/project/creator-dashboard-status`, config);
            console.log('UserContext: Dashboard status fetched successfully:', dashboardStatusRes.data);
            setHasDashboard(dashboardStatusRes.data.hasDashboard);

        } catch (error) {
            console.error('UserContext: Failed to fetch user data or dashboard status:', error.response?.data?.message || error.message);
            // The interceptor should ideally handle the logout based on 401/403.
            // This catch block would primarily handle network errors or other server errors (e.g., 500).
            // If the interceptor calls logout, then `token` state will become null,
            // triggering the main useEffect, which then calls fetchUserData with no token,
            // leading to the `No authToken provided... Resetting user state` path.
            
            // This part might still be useful for non-401/403 errors, but for 401/403,
            // the interceptor takes precedence. If you want UserContext to manage logout
            // explicitly for 401/403, remove that logic from the interceptor.
            // However, a global interceptor is often preferred for consistency.
            if (!error.response || (error.response.status !== 401 && error.response.status !== 403)) {
                 // For other errors, you might still want to log out or show an error
                 console.log('UserContext: Non-authentication error. Clearing user/token states locally.');
                 logout(); 
            }
        } finally {
            setLoadingUser(false);
            console.log('UserContext: fetchUserData finished.');
        }
    }, [logout]);

    // This useEffect will run once when the provider mounts to set up the interceptors
    // and whenever `logout` function itself changes (which it won't due to useCallback)
    useEffect(() => {
        console.log('UserContext: Setting up Axios interceptors.');
        setupAxiosInterceptors(logout); // Pass the logout function
    }, [logout]); // Depend on logout to ensure it's always the latest memoized version

    useEffect(() => {
        console.log('UserContext: Main useEffect (token/initial load) triggered. Current token state:', token ? 'PRESENT' : 'ABSENT');
        if (token) {
            fetchUserData(token);
        } else {
            setUser(null);
            setHasDashboard(false);
            setLoadingUser(false);
        }
    }, [token, fetchUserData]);

    const login = useCallback((jwtToken) => {
        console.log('UserContext: login called from external component. Setting token...');
        localStorage.setItem('jwtToken', jwtToken);
        console.log('UserContext: Token SET in localStorage. Verification:', localStorage.getItem('jwtToken') ? 'SUCCESS' : 'FAILED');
        setToken(jwtToken);
        setLoadingUser(true);
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
        refetchUserData: fetchUserData,
    };

    return (
        <UserContext.Provider value={contextValue}>
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