// src/components/SparkCampaignCard/SparkCampaignGrid.js
import React from 'react';
import SparkCampaignCard from '../SparkCampaignCard/SparkCampaignCard'; // Assuming correct relative path
// The CSS for SparkCampaignCard.css already includes styles for .spark-campaign-card
// We need a separate CSS file for the grid container itself if it's not already in global styles.
import './SparkCampaignGrid.css'; // <--- NEW: Import CSS specific to the grid container

const SparkCampaignGrid = ({ sparkCampaigns }) => {
    // This initial check for empty or null array is good.
    if (!sparkCampaigns || sparkCampaigns.length === 0) {
        return (
            <div className="spark-campaign-empty-state-message">
                <p className="spark-campaign-empty-state-title">No Spark Campaigns found.</p>
                <p className="spark-campaign-empty-state-text">Check back soon for new opportunities to spark growth!</p>
            </div>
        );
    }

    return (
        <div className="spark-campaign-grid-container">
            {sparkCampaigns.map((campaign) => {
                // ⭐ ADD THIS NULL/UNDEFINED CHECK FOR EACH ITEM IN THE ARRAY
                if (!campaign) {
                    console.warn("Skipping null or undefined campaign in SparkCampaignGrid:", campaign);
                    return null; // Don't render anything for null/undefined entries
                }
                // ⭐ Ensure 'campaign._id' is also checked if it could be missing for valid campaigns
                if (!campaign._id) {
                    console.warn("Skipping campaign with missing _id:", campaign);
                    return null; // Don't render if a campaign doesn't have an _id
                }

                return (
                    <SparkCampaignCard key={campaign._id} campaign={campaign} />
                );
            })}
        </div>
    );
};

export default SparkCampaignGrid;