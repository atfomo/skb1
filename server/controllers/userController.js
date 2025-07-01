

const User = require('../models/User');
const SparkCampaign = require('../models/SparkCampaign'); // Keep if used elsewhere or for future features
const Action = require('../models/Action'); // Keep if used elsewhere or for future features

const getUserEarnings = async (req, res) => {

    
    

    const telegramUserId = req.query.telegramUserId;
    const campaignId = req.query.campaignId; // Optional campaign ID

    

    if (!telegramUserId) {
        console.warn('getUserEarnings: Missing telegramUserId in query for bot request.');
        return res.status(400).json({ message: 'Telegram user ID is required.' });
    }

    try {
        const user = await User.findOne({ telegramUserId: telegramUserId });

        if (!user) {
            console.warn(`getUserEarnings: User not found for Telegram User ID: ${telegramUserId}`);
            return res.status(404).json({ message: 'Telegram user not found. Please link your account first.' });
        }



        if (user.accountStatus === 'banned') {
            
            return res.status(403).json({ message: 'Your account is banned and cannot access earnings.' });
        }
        if (user.accountStatus === 'pending_review' || user.accountStatus === 'on_hold') {
            
            return res.status(403).json({ message: `Your account is ${user.accountStatus}. Please contact support.` });
        }
        if (user.accountStatus === 'unverified') {
            
            return res.status(403).json({ message: 'Your account is unverified. Please complete verification to access earnings.' });
        }




        let totalOverallEarnings = 0;
        const earningsDetails = []; // This array will hold aggregated details

        let query = { userId: user._id };
        if (campaignId) {
            query.campaignId = campaignId;
            
        } else {
            
        }

        const earningsAggregation = await Action.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$actionType',
                    totalCount: { $sum: 1 },
                    totalEarned: { $sum: '$amountEarned' }
                }
            },
            {
                $project: {
                    _id: 0,
                    actionType: '$_id',
                    totalCount: 1,
                    totalEarned: 1
                }
            }
        ]);

        let totalMessages = 0;
        let totalReactions = 0;
        let totalEarnedFromActions = 0;

        earningsAggregation.forEach(item => {
            if (item.actionType === 'message') {
                totalMessages = item.totalCount;
                totalEarnedFromActions += item.totalEarned;
            } else if (item.actionType === 'reaction') {
                totalReactions = item.totalCount;
                totalEarnedFromActions += item.totalEarned;
            }

            
        });







        totalOverallEarnings = user.pendingEarnings || 0; // Use the value from the User model

        earningsDetails.push({
            type: 'Overall',
            totalEarnings: totalOverallEarnings,

            totalMessages: totalMessages,
            totalReactions: totalReactions,
            currency: 'USD' // Assuming USD is the default currency
        });

        

        res.status(200).json({
            message: 'Earnings fetched successfully.',
            telegramUserId: telegramUserId,
            totalOverallEarnings: totalOverallEarnings.toFixed(2), // Format for display
            details: earningsDetails,
            username: user.username, // Provide username for bot response
            telegramUsername: user.telegramUsername || user.username // Provide Telegram username if available
        });

    } catch (error) {
        console.error('ERROR in getUserEarnings:', error.message, error.stack);
        res.status(500).json({ message: 'Server error while fetching earnings.' });
    }
};

module.exports = {
    getUserEarnings,

};