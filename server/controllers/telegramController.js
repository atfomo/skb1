// backend/controllers/telegramController.js
const User = require('../models/User');
const TelegramVerification = require('../models/TelegramVerification'); // Import the new model
const generateRandomCode = require('../utils/generateRandomCode');
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;
const SECRET_BOT_API_KEY = process.env.SECRET_BOT_API_KEY; // Get secret key from environment
const SparkCampaign = require('../models/SparkCampaign'); // Make sure this is imported!
const UserCampaignParticipation = require('../models/UserCampaignParticipation');

// Function to initiate the verification process from the website
exports.initiateVerification = async (req, res) => {
    const { telegramUsername } = req.body;
    const userId = req.user.id; // User ID from authenticated JWT

    if (!telegramUsername) {
        return res.status(400).json({ message: "Telegram username is required." });
    }

    const cleanUsername = telegramUsername.startsWith('@') ? telegramUsername.substring(1) : telegramUsername;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (!BOT_USERNAME) {
            console.error("ERROR: TELEGRAM_BOT_USERNAME is not defined in backend environment variables!");
            return res.status(500).json({ message: "Server configuration error: Telegram bot username is missing." });
        }
        console.log(`Backend is using BOT_USERNAME: @${BOT_USERNAME}`);

        // Check if there's an existing pending verification for this user
        const existingVerification = await TelegramVerification.findOne({ userId });
        if (existingVerification) {
            // If exists and not expired, return existing code or refresh it
            if (new Date() < existingVerification.expiresAt) {
                // If the existing code is still valid, return it to the user
                return res.status(200).json({
                    message: "A verification is already pending. Please use the existing code.",
                    verificationCode: existingVerification.verificationCode,
                    botUsername: BOT_USERNAME
                });
            } else {
                // If expired, remove it to allow a new one to be created
                await TelegramVerification.deleteOne({ userId });
            }
        }

        // Generate a unique verification code
        const verificationCode = generateRandomCode(8); // e.g., 8-character alphanumeric code
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Code valid for 5 minutes

        // Create and save the new pending verification to MongoDB
        const newVerification = new TelegramVerification({
            userId,
            verificationCode,
            telegramUsername: cleanUsername,
            expiresAt
        });
        await newVerification.save();

        console.log(`Initiated Telegram verification for user ${userId} with code ${verificationCode}. Telegram username: @${cleanUsername}`);

        res.status(200).json({
            message: "Verification initiated. Please open Telegram and follow the instructions.",
            verificationCode,
            botUsername: BOT_USERNAME
        });

    } catch (error) {
        console.error("Error initiating Telegram verification:", error);
        res.status(500).json({ message: "Server error initiating Telegram verification." });
    }
};

// Function for the Telegram bot to complete the verification
exports.completeVerification = async (req, res) => {
    const botSecret = req.headers['x-bot-secret'];
    console.log('Backend expects SECRET_BOT_API_KEY (from env):', SECRET_BOT_API_KEY); // Use the variable
    console.log('Backend received x-bot-secret header:', botSecret);

    if (botSecret !== SECRET_BOT_API_KEY) { // Compare against the variable
        console.warn(`Unauthorized attempt to complete Telegram verification from IP: ${req.ip}`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret." });
    }

    const { verificationCode, telegramUserId, telegramUsername, telegramFirstName, telegramLastName, telegramPhotoUrl } = req.body;

    if (!verificationCode || !telegramUserId || !telegramUsername) {
        return res.status(400).json({ message: "Missing required verification data." });
    }

    try {
        // Find the pending verification in MongoDB
        const pendingVerification = await TelegramVerification.findOne({ verificationCode });

        if (!pendingVerification) {
            return res.status(404).json({ message: "Invalid or expired verification code." });
        }

        if (new Date() > pendingVerification.expiresAt) {
            await TelegramVerification.deleteOne({ _id: pendingVerification._id }); // Clean up expired code
            return res.status(400).json({ message: "Verification code has expired. Please try again." });
        }

        // Optional: For added security, ensure the username from the bot matches the one entered by the user
        if (pendingVerification.telegramUsername.toLowerCase() !== telegramUsername.toLowerCase()) {
            console.warn(`Telegram username mismatch for code ${verificationCode}. Expected: ${pendingVerification.telegramUsername}, Received: ${telegramUsername}`);
            return res.status(400).json({ message: "Telegram username mismatch. Please ensure you entered the correct username on the website." });
        }

        const user = await User.findById(pendingVerification.userId);
        if (!user) {
            // User might have been deleted after initiating verification
            await TelegramVerification.deleteOne({ _id: pendingVerification._id }); // Clean up invalid entry
            return res.status(404).json({ message: "Associated user not found." });
        }

        // Check if this Telegram account is already linked to another user
        const existingTelegramUser = await User.findOne({ telegramUserId: telegramUserId });
        if (existingTelegramUser && existingTelegramUser._id.toString() !== user._id.toString()) {
            // Also check if the username is already taken by another user who has linked their Telegram.
            const existingTelegramUsernameUser = await User.findOne({ telegramUsername: telegramUsername });
            if (existingTelegramUsernameUser && existingTelegramUsernameUser._id.toString() !== user._id.toString()) {
                console.warn(`Attempt to link already used Telegram username: @${telegramUsername} to user ${user._id}. Already linked to ${existingTelegramUsernameUser._id}`);
                return res.status(409).json({ message: "This Telegram username is already linked to another FOMO account." });
            }

            console.warn(`Attempt to link already used Telegram ID: ${telegramUserId} to user ${user._id}. Already linked to ${existingTelegramUser._id}`);
            return res.status(409).json({ message: "This Telegram account is already linked to another FOMO user." });
        }
        
        // Update user's Telegram details
        user.telegramUserId = telegramUserId;
        user.telegramUsername = telegramUsername;
        user.telegramFirstName = telegramFirstName;
        user.telegramLastName = telegramLastName;
        user.telegramPhotoUrl = telegramPhotoUrl;

        await user.save();

        // Clean up the pending verification entry from MongoDB after successful linking
        await TelegramVerification.deleteOne({ _id: pendingVerification._id });

        console.log(`Telegram account @${telegramUsername} (${telegramUserId}) linked to user ${pendingVerification.userId}.`);
        res.status(200).json({ message: "Telegram account linked successfully!" });

    } catch (error) {
        console.error("Error completing Telegram verification:", error);
        res.status(500).json({ message: "Server error completing Telegram verification." });
    }
};

// NEW: Function to track messages from Telegram groups
exports.trackMessage = async (req, res) => {
    const botSecret = req.headers['x-bot-secret'];
    console.log('[Backend trackMessage] Backend expects SECRET_BOT_API_KEY:', SECRET_BOT_API_KEY);
    console.log('[Backend trackMessage] Backend received x-bot-secret header:', botSecret);

    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`[Backend trackMessage] Unauthorized attempt to track message from IP: ${req.ip}`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret." });
    }

    const { telegramChatId, telegramMessageId, telegramUserId, telegramUsername, messageContent, timestamp } = req.body;

    // Basic validation
    if (!telegramChatId || !telegramUserId || !messageContent) {
        console.warn(`[Backend trackMessage] Missing required tracking data: chatID=${telegramChatId}, userID=${telegramUserId}, content present=${!!messageContent}`);
        return res.status(400).json({ message: "Missing required tracking data (chat ID, user ID, content)." });
    }

    try {
        // 1. Find the User using telegramUserId
        const user = await User.findOne({ telegramUserId: telegramUserId });
        if (!user) {
            console.log(`[Backend trackMessage] Message from unlinked Telegram ID ${telegramUserId} in chat ${telegramChatId}.`);
            // It's okay to return 200 here, as it's not an error from the bot's perspective
            return res.status(200).json({ message: "Telegram ID not linked to a FOMO account. Message not tracked for rewards." });
        }

        // 2. Find the Campaign using telegramChatId (group ID)
        // ⭐ UPDATED: Using telegramChatId from the request body to query the SparkCampaign model
        const campaign = await SparkCampaign.findOne({ telegramChatId: telegramChatId });
        if (!campaign) {
            console.log(`[Backend trackMessage] Message from linked user ${user.username} (${user._id}) in unassociated Telegram group ID ${telegramChatId}.`);
            return res.status(200).json({ message: "Group not associated with an active campaign. Message not tracked." });
        }

        // Optional: Check campaign status if you only want to track for active campaigns
        if (campaign.status !== 'active') {
             console.log(`[Backend trackMessage] Message from user ${user.username} in inactive campaign ${campaign.name} (${campaign._id}). Status: ${campaign.status}.`);
             return res.status(200).json({ message: "Campaign is not active, messages not tracked." });
        }

        // 3. Find or Create UserCampaignParticipation record
        let participation = await UserCampaignParticipation.findOne({
            userId: user._id,
            campaignId: campaign._id
        });

        if (!participation) {
            // Create a new participation entry if it doesn't exist
            participation = new UserCampaignParticipation({
                userId: user._id,
                campaignId: campaign._id,
                telegramJoined: true, // If they sent a message, they must have joined
                lastTelegramMessageAt: new Date(timestamp),
                totalTelegramMessages: 1
            });
            console.log(`[Backend trackMessage] Created new participation record for user ${user.username} in campaign ${campaign.name}.`);
        } else {
            // Update existing participation entry
            participation.telegramJoined = true; // Ensure this is true
            participation.lastTelegramMessageAt = new Date(timestamp);
            participation.totalTelegramMessages = (participation.totalTelegramMessages || 0) + 1;
            console.log(`[Backend trackMessage] Updated participation record for user ${user.username} in campaign ${campaign.name}.`);
        }

        // Save the participation record
        await participation.save();

        // 4. Update Campaign statistics (total messages, unique users engaged)
        campaign.totalMessagesTracked = (campaign.totalMessagesTracked || 0) + 1;
        
        const userIdString = user._id.toString();
        if (!campaign.uniqueUsersEngagedIds.includes(userIdString)) {
            campaign.uniqueUsersEngagedIds.push(userIdString);
            campaign.uniqueUsersEngagedCount = campaign.uniqueUsersEngagedIds.length;
            console.log(`[Backend trackMessage] Added ${user.username} to uniqueUsersEngagedIds for campaign ${campaign.name}.`);
        }

        await campaign.save();

        console.log(`[Backend trackMessage] Message successfully tracked: User ${user.username} in campaign ${campaign.name}. Campaign total messages: ${campaign.totalMessagesTracked}.`);
        res.status(200).json({ message: "Message tracked successfully." });

    } catch (error) {
        console.error("[Backend trackMessage] Error tracking Telegram message:", error);
        // Provide more detailed error response for debugging, but hide sensitive info from production
        res.status(500).json({ message: "Server error tracking Telegram message.", error: error.message });
    }
};

// --- CORRECTED FUNCTION: Link a Telegram group chat ID to a SparkCampaign ---
// ⭐ UPDATED: Now sets sparkCampaign.telegramChatId (singular) ⭐
exports.linkCampaignGroup = async (req, res) => {
    try {
        const { campaignId, telegramChatId, telegramGroupLink } = req.body; // campaignId here refers to SparkCampaign ID

        // Basic validation: ensure necessary data is present
        if (!campaignId || !telegramChatId) {
            return res.status(400).json({ message: 'SparkCampaign ID and Telegram Chat ID are required.' });
        }

        // Find the SparkCampaign by ID
        const sparkCampaign = await SparkCampaign.findById(campaignId);

        if (!sparkCampaign) {
            return res.status(404).json({ message: 'SparkCampaign not found.' });
        }

        // Check if the chat ID is already linked to this specific campaign
        if (sparkCampaign.telegramChatId && sparkCampaign.telegramChatId === telegramChatId) {
            return res.status(200).json({ message: 'This chat ID is already linked to this SparkCampaign.' });
        }

        // IMPORTANT: If you want to prevent one Telegram group from being linked to MULTIPLE SparkCampaigns,
        // you would add a check here:
        const existingCampaignWithThisChatId = await SparkCampaign.findOne({ telegramChatId: telegramChatId });
        if (existingCampaignWithThisChatId && existingCampaignWithThisChatId._id.toString() !== campaignId) {
             return res.status(409).json({ message: 'This Telegram group is already linked to another Spark Campaign.' });
        }


        // Link the new Telegram Chat ID to the SparkCampaign
        sparkCampaign.telegramChatId = telegramChatId;
        
        // Update the public group link if provided
        if (telegramGroupLink) {
            sparkCampaign.telegramGroupLink = telegramGroupLink;
        }

        await sparkCampaign.save(); // Save the updated SparkCampaign document

        console.log(`[Backend] Successfully linked Telegram group ${telegramChatId} to SparkCampaign ${campaignId}.`);
        res.status(200).json({ message: 'SparkCampaign successfully linked to Telegram group.', sparkCampaign });

    } catch (error) {
        console.error('[Backend] Error linking SparkCampaign to Telegram group:', error);
        res.status(500).json({ message: 'An internal server error occurred while linking the SparkCampaign.' });
    }
};