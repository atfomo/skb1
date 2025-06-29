// client/src/pages/FOMOCampaignsPage/FOMOCampaignsPage.jsx
import React, { useState, useEffect } from 'react';
import ProjectGrid from '../../components/ProjectGrid/ProjectGrid';
import './FOMOCampaignsPage.css';
import axios from 'axios';
import { useUser } from '../../UserContext'; // Import useUser to get the token
import { API_BASE_URL } from '../../config';

// const API_BASE_URL = "http://localhost:5000";

const FOMOCampaignsPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useUser(); // Get the token from your UserContext

    useEffect(() => {
        const fetchCampaigns = async () => {
            setLoading(true);
            setError(null);
            try {
                // Check if token exists before making a protected API call
                if (!token) {
                    setError("You must be logged in to view campaigns.");
                    setLoading(false);
                    return;
                }

                console.log('FOMOCampaignsPage: Fetching FOMO campaigns from backend...');
                const response = await axios.get(`${API_BASE_URL}/api/campaigns`, { // <--- Changed endpoint to /api/campaigns
                    headers: {
                        Authorization: `Bearer ${token}`, // <--- Added Authorization header
                    },
                });
                console.log('FOMOCampaignsPage: Received data:', response.data);

                setCampaigns(response.data);

            } catch (err) {
                console.error("FOMOCampaignsPage: Error fetching FOMO campaigns:", err.response?.data || err.message);
                setError(err.response?.data?.message || 'Failed to fetch FOMO campaigns. Please try again later.');
            } finally {
                setLoading(false);
                console.log('FOMOCampaignsPage: Fetching complete.');
            }
        };

        fetchCampaigns();
    }, [token]); // Add token to dependency array so it refetches if token changes (e.g., after login/logout)

    if (loading) {
        return <div className="fomo-campaigns-container loading-message">Loading FOMO Campaigns...</div>;
    }

    if (error) {
        return <div className="fomo-campaigns-container error-message">Error: {error}</div>;
    }

    return (
        <div className="fomo-campaigns-container">
            <h2 className="fomo-campaigns-title">FOMO Campaigns</h2>
            <p className="fomo-campaigns-subtitle">Explore campaigns launched by creators seeking to boost their on-chain metrics.</p>
            <ProjectGrid projects={campaigns} />
        </div>
    );
};

export default FOMOCampaignsPage;