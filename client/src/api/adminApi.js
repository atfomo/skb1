
import axiosInstance from '../utils/axiosInstance'; // <-- IMPORT YOUR CUSTOM AXIOS INSTANCE
import { API_BASE_URL } from '../config'; 
















export const fetchAdminCampaigns = async () => {

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