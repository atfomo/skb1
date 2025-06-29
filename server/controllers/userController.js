// backend/controllers/userController.js

const User = require('../models/User');
const SparkCampaign = require('../models/SparkCampaign'); // Keep if used elsewhere or for future features
const Action = require('../models/Action'); // Keep if used elsewhere or for future features

const getUserEarnings = async (req, res) => {
    console.log('*** userController.getUserEarnings HIT! (Final Version) ***'); // Updated log for clarity
    console.log('req.query for getUserEarnings:', req.query);
    console.log('req.user for getUserEarnings (expected null/undefined for bot):', req.user);

    const telegramUserId = req.query.telegramUserId;
    const campaignId = req.query.campaignId; // Optional campaign ID

    console.log(`Fetching earnings for Telegram User ID: ${telegramUserId}, Campaign ID: ${campaignId || 'All'}`);

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

        // --- ACCOUNT STATUS CHECKS (Moved from checkUserStatus middleware) ---
        // These checks are crucial here because this endpoint is bot-authenticated.
        if (user.accountStatus === 'banned') {
            console.log(`DEBUG (getUserEarnings): Banned user ${user.username} tried to access earnings.`);
            return res.status(403).json({ message: 'Your account is banned and cannot access earnings.' });
        }
        if (user.accountStatus === 'pending_review' || user.accountStatus === 'on_hold') {
            console.log(`DEBUG (getUserEarnings): User ${user.username} account is ${user.accountStatus}.`);
            return res.status(403).json({ message: `Your account is ${user.accountStatus}. Please contact support.` });
        }
        if (user.accountStatus === 'unverified') {
            console.log(`DEBUG (getUserEarnings): User ${user.username} account is unverified.`);
            return res.status(403).json({ message: 'Your account is unverified. Please complete verification to access earnings.' });
        }
        // Add any other specific account statuses that should prevent earning display
        // --- END ACCOUNT STATUS CHECKS ---


        let totalOverallEarnings = 0;
        const earningsDetails = []; // This array will hold aggregated details

        let query = { userId: user._id };
        if (campaignId) {
            query.campaignId = campaignId;
            console.log(`getUserEarnings: Filtering actions by campaignId: ${campaignId}`);
        } else {
            console.log('getUserEarnings: Fetching actions for all campaigns for this user.');
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
            // Add other action types if you have them and want to include them in the sum
            console.log(`getUserEarnings: Aggregated ${item.actionType}: Count=${item.totalCount}, Earned=${item.totalEarned}`);
        });

        // The user's pendingEarnings from the User model should be the source of truth
        // if it represents the total accumulated earnings.
        // If totalEarnedFromActions is a subset (e.g., only from recent actions),
        // then you might want to combine it with user.pendingEarnings or user.totalEarned.
        // Based on your previous code, user.pendingEarnings was used for payout requests.
        // Let's make user.pendingEarnings the primary source for overall earnings.
        totalOverallEarnings = user.pendingEarnings || 0; // Use the value from the User model

        earningsDetails.push({
            type: 'Overall',
            totalEarnings: totalOverallEarnings,
            // Include action counts for context, even if earnings are from pendingEarnings
            totalMessages: totalMessages,
            totalReactions: totalReactions,
            currency: 'USD' // Assuming USD is the default currency
        });

        console.log(`getUserEarnings: Final overall earnings for ${user.username}: $${totalOverallEarnings.toFixed(2)}`);

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
    // ... other user-related controller functions if you add them later
};