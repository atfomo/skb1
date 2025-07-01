
import axios from 'axios';
import { API_BASE_URL } from '../config';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});


axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwtToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


export const setupAxiosInterceptors = (logoutFunction) => {
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response) {
                if ((error.response.status === 401 || error.response.status === 403) &&
                    !error.config.url.includes('/auth/login') &&
                    !error.config.url.includes('/auth/register'))
                {
                    console.warn('[Axios Interceptor] Unauthorized or Forbidden response detected. Calling logout function.');
                    logoutFunction(); // <--- CALL THE LOGOUT FUNCTION HERE



                }
            }
            return Promise.reject(error);
        }
    );
};

export default axiosInstance;