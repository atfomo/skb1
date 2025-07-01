
import React from 'react';
import SparkCampaignCard from '../SparkCampaignCard/SparkCampaignCard'; // Assuming correct relative path


import './SparkCampaignGrid.css'; // <--- NEW: Import CSS specific to the grid container

const SparkCampaignGrid = ({ sparkCampaigns }) => {

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

                if (!campaign) {
                    console.warn("Skipping null or undefined campaign in SparkCampaignGrid:", campaign);
                    return null; // Don't render anything for null/undefined entries
                }

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