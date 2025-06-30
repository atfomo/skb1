// src/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axiosInstance, { setupAxiosInterceptors } from './utils/axiosInstance';
import { FaSpinner } from 'react-icons/fa'; // <--- ADD THIS IMPORT


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

    const fetchUserData = useCallback(async (explicitAuthToken) => {
        setLoadingUser(true);
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
            if (!error.response || (error.response.status !== 401 && error.response.status !== 403)) {
                 console.log('UserContext: Non-authentication error during fetch. Clearing user/token states locally.');
                 logout();
            }
        } finally {
            setLoadingUser(false);
            console.log('UserContext: fetchUserData finished.');
        }
    }, [logout, token]);

    useEffect(() => {
        console.log('UserContext: Setting up Axios interceptors.');
        setupAxiosInterceptors(logout);
    }, [logout]);

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
        refetchUserData: () => fetchUserData(token),
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