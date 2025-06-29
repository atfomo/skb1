// src/api/adminApi.js
import { API_BASE_URL } from '../config'; // <--- IMPORT API_BASE_URL

// Change this line to use the imported API_BASE_URL
const ADMIN_API_BASE_URL = `${API_BASE_URL}/api/admin`; // Your backend admin API base URL

const getAuthHeaders = () => {
    const token = localStorage.getItem('token'); // Assuming JWT token is stored here
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const fetchAdminCampaigns = async () => {
    const response = await fetch(`${ADMIN_API_BASE_URL}/boost-volume/campaigns`, { // Use ADMIN_API_BASE_URL
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch admin campaigns');
    }
    return response.json();
};

export const fetchAdminCampaignParticipations = async (campaignId) => {
    const response = await fetch(`${ADMIN_API_BASE_URL}/boost-volume/campaigns/${campaignId}/participations`, { // Use ADMIN_API_BASE_URL
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch admin participations');
    }
    return response.json();
};

export const verifyUserLoop = async (participationId, signature) => {
    const response = await fetch(`${ADMIN_API_BASE_URL}/boost-volume/participations/${participationId}/verify-loop`, { // Use ADMIN_API_BASE_URL
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ signature })
    });
    if (!response.ok) {
        const errorData = await response.json();
        // If the errorData doesn't exist or doesn't have a message, provide a generic one
        throw new Error(errorData.message || 'Failed to verify loop');
    }
    return response.json();
};

export const markUserPaid = async (participationId, transactionId) => {
    const response = await fetch(`${ADMIN_API_BASE_URL}/boost-volume/participations/${participationId}/mark-paid`, { // Use ADMIN_API_BASE_URL
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ transactionId })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark as paid');
    }
    return response.json();
};

// NEW: Function to reject a user's loop
export const rejectUserLoop = async (participationId, reason) => {
    const response = await fetch(`${ADMIN_API_BASE_URL}/boost-volume/participations/${participationId}/reject-loop`, { // Use ADMIN_API_BASE_URL
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject loop');
    }
    return response.json();
};