
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
        
        setToken(null);
        setUser(null);
        setHasDashboard(false);
        localStorage.removeItem('jwtToken');
        
    }, []);

    const fetchUserData = useCallback(async (explicitAuthToken) => {
        setLoadingUser(true);
        const currentToken = explicitAuthToken || token;

        

        if (!currentToken) {
            
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
            
            const userRes = await axiosInstance.get('/auth/me');
            

            setUser(userRes.data);

            
            const dashboardStatusRes = await axiosInstance.get('/api/project/creator-dashboard-status');
            
            setHasDashboard(dashboardStatusRes.data.hasDashboard);

        } catch (error) {
            console.error('UserContext: Failed to fetch user data or dashboard status:', error.response?.data?.message || error.message);
            if (!error.response || (error.response.status !== 401 && error.response.status !== 403)) {
                 
                 logout();
            }
        } finally {
            setLoadingUser(false);
            
        }
    }, [logout, token]);

    useEffect(() => {
        
        setupAxiosInterceptors(logout);
    }, [logout]);

    useEffect(() => {
        
        if (token) {
            fetchUserData(token);
        } else {
            setUser(null);
            setHasDashboard(false);
            setLoadingUser(false);
        }
    }, [token, fetchUserData]);

    const login = useCallback((jwtToken) => {
        
        localStorage.setItem('jwtToken', jwtToken);
        
        setToken(jwtToken);
        setLoadingUser(true);
    }, []);

    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'jwtToken') {
                const storedToken = localStorage.getItem('jwtToken');
                if (storedToken !== token) {
                    
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