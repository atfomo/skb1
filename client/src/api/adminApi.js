// src/api/adminApi.js
import axiosInstance from '../utils/axiosInstance'; // <-- IMPORT YOUR CUSTOM AXIOS INSTANCE
import { API_BASE_URL } from '../config'; 

// The base URL is already set in axiosInstance, so you can often use relative paths.
// If your backend structure means /api/admin is separate from the default axiosInstance.baseURL,
// then keep the full path. Given your config, axiosInstance.baseURL is `${API_BASE_URL}`,
// so you can use relative paths like '/api/admin/boost-volume/campaigns'.
// I'll leave them explicit for clarity based on your original file.

// No need for this, axiosInstance handles headers via interceptor now
// const getAuthHeaders = () => {
//     const token = localStorage.getItem('token'); // Assuming JWT token is stored here
//     return {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`
//     };
// };

export const fetchAdminCampaigns = async () => {
    // axiosInstance handles Authorization header automatically
    const response = await axiosInstance.get(`/api/admin/boost-volume/campaigns`); 
    return response.data; // Axios returns data directly in .data
};

export const fetchAdminCampaignParticipations = async (campaignId) => {
    const response = await axiosInstance.get(`/api/admin/boost-volume/campaigns/${campaignId}/participations`); 
    return response.data;
};

export const verifyUserLoop = async (participationId, signature) => {
    const response = await axiosInstance.post(`/api/admin/boost-volume/participations/${participationId}/verify-loop`, { signature });
    return response.data;
};

export const markUserPaid = async (participationId, transactionId) => {
    const response = await axiosInstance.post(`/api/admin/boost-volume/participations/${participationId}/mark-paid`, { transactionId });
    return response.data;
};

export const rejectUserLoop = async (participationId, reason) => {
    const response = await axiosInstance.post(`/api/admin/boost-volume/participations/${participationId}/reject-loop`, { reason });
    return response.data;
};