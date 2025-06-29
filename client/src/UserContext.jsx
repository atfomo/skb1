import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from './config';

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
        localStorage.removeItem('jwtToken'); // <-- This is the key action of logout()
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
                logout(); // Call full logout if token is expired locally
                return;
            }
        } catch (decodeError) {
            console.error('UserContext: Failed to decode stored JWT (malformed). Initiating logout.', decodeError);
            logout(); // Call full logout for malformed token
            return;
        }

        try {
            const config = { headers: { 'Authorization': `Bearer ${authToken}` } };

            console.log('UserContext: Attempting to fetch user data from /auth/me...');
            const userRes = await axios.get(`${API_BASE_URL}/auth/me`, config);
            console.log('UserContext: User data fetched successfully from /auth/me:', userRes.data);

            setUser(userRes.data);

            console.log('UserContext: Attempting to fetch dashboard status from /api/project/creator-dashboard-status...');
            const dashboardStatusRes = await axios.get(`${API_BASE_URL}/api/project/creator-dashboard-status`, config);
            console.log('UserContext: Dashboard status fetched successfully:', dashboardStatusRes.data);
            setHasDashboard(dashboardStatusRes.data.hasDashboard);

        } catch (error) {
            console.error('UserContext: Failed to fetch user data or dashboard status:', error.response?.data?.message || error.message);
            
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.log('UserContext: Server responded with 401/403. Token invalid/expired or unauthorized. Calling logout()...');
                logout(); // Only call full logout for explicit auth errors
            } else {
                // --- MODIFIED ERROR HANDLING HERE ---
                console.warn('UserContext: Non-authentication error during fetchUserData. Clearing user state but keeping token in localStorage.');
                setUser(null); // Clear user data in state
                setHasDashboard(false); // Clear dashboard status
                // Do NOT call logout() here, which would remove token from localStorage.
                // The main useEffect will see the token is still there and retry on next render/token change
                // or the user can refresh to retry. This prevents premature full logouts.
            }
        } finally {
            setLoadingUser(false);
            console.log('UserContext: fetchUserData finished.');
        }
    }, [logout]); // logout is a dependency but it's memoized with useCallback

    // This useEffect runs once on mount, and whenever `token` state changes
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

    // Handles changes to localStorage from other tabs/windows
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