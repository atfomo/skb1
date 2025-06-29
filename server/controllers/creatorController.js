// backend/controllers/creatorController.js
const SparkCampaign = require('../models/SparkCampaign');
const mongoose = require('mongoose'); // Needed for ObjectId validation

exports.getCreatorCampaigns = async (req, res) => {
    // The authenticateJWT middleware should populate req.user.id
    const creatorId = req.user.id;

    if (!creatorId) {
        console.error('getCreatorCampaigns ERROR: No creatorId found in req.user. This route requires authentication.');
        return res.status(401).json({ success: false, message: 'Unauthorized: Creator ID not found.' });
    }

    if (!mongoose.Types.ObjectId.isValid(creatorId)) {
        return res.status(400).json({ success: false, message: 'Invalid creator ID format.' });
    }

    try {
        // Fetch Spark Campaigns for this creator
        const sparkCampaigns = await SparkCampaign.find({ creatorId }).sort({ createdAt: -1 });

        // If you have other campaign types (e.g., 'FireDripCampaign'), fetch them here too
        // const fireDripCampaigns = await FireDripCampaign.find({ creatorId }).sort({ createdAt: -1 });

        // Combine all campaigns if needed, or send SparkCampaigns specifically
        // For now, let's just send SparkCampaigns as they are the known type.
        const allCreatorCampaigns = sparkCampaigns; // Add other types if they exist

        res.status(200).json({
            success: true,
            data: allCreatorCampaigns,
            message: 'Creator campaigns fetched successfully.'
        });

    } catch (error) {
        console.error('Error fetching creator campaigns:', error);
        res.status(500).json({ success: false, message: 'Server error fetching creator campaigns.' });
    }
};

// ... (other creator-related controller functions if any)