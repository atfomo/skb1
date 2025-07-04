// controllers/telegramController.js

const User = require('../models/User');
const TelegramVerification = require('../models/TelegramVerification');
const generateRandomCode = require('../utils/generateRandomCode');
const SparkCampaign = require('../models/SparkCampaign'); // Make sure this is imported!
const UserCampaignParticipation = require('../models/UserCampaignParticipation');
const mongoose = require('mongoose'); // Import mongoose for ObjectId validation

// Make sure these environment variables are correctly loaded in your backend service
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;
const SECRET_BOT_API_KEY = process.env.SECRET_BOT_API_KEY;

// --- Existing Controller Functions ---

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
        
        const existingVerification = await TelegramVerification.findOne({ userId });
        if (existingVerification) {
            if (new Date() < existingVerification.expiresAt) {
                return res.status(200).json({
                    message: "A verification is already pending. Please use the existing code.",
                    verificationCode: existingVerification.verificationCode,
                    botUsername: BOT_USERNAME
                });
            } else {
                await TelegramVerification.deleteOne({ userId });
            }
        }

        const verificationCode = generateRandomCode(8); // e.g., 8-character alphanumeric code
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Code valid for 5 minutes

        const newVerification = new TelegramVerification({
            userId,
            verificationCode,
            telegramUsername: cleanUsername,
            expiresAt
        });
        await newVerification.save();

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

exports.completeVerification = async (req, res) => {
    const botSecret = req.headers['x-bot-secret'];

    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`Unauthorized attempt to complete Telegram verification from IP: ${req.ip}`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret." });
    }

    const { verificationCode, telegramUserId, telegramUsername, telegramFirstName, telegramLastName, telegramPhotoUrl } = req.body;

    if (!verificationCode || !telegramUserId || !telegramUsername) {
        return res.status(400).json({ message: "Missing required verification data." });
    }

    try {
        const pendingVerification = await TelegramVerification.findOne({ verificationCode });

        if (!pendingVerification) {
            return res.status(404).json({ message: "Invalid or expired verification code." });
        }

        if (new Date() > pendingVerification.expiresAt) {
            await TelegramVerification.deleteOne({ _id: pendingVerification._id });
            return res.status(400).json({ message: "Verification code has expired. Please try again." });
        }

        if (pendingVerification.telegramUsername.toLowerCase() !== telegramUsername.toLowerCase()) {
            console.warn(`Telegram username mismatch for code ${verificationCode}. Expected: ${pendingVerification.telegramUsername}, Received: ${telegramUsername}`);
            return res.status(400).json({ message: "Telegram username mismatch. Please ensure you entered the correct username on the website." });
        }

        const user = await User.findById(pendingVerification.userId);
        if (!user) {
            await TelegramVerification.deleteOne({ _id: pendingVerification._id });
            return res.status(404).json({ message: "Associated user not found." });
        }

        const existingTelegramUser = await User.findOne({ telegramUserId: telegramUserId });
        if (existingTelegramUser && existingTelegramUser._id.toString() !== user._id.toString()) {
            const existingTelegramUsernameUser = await User.findOne({ telegramUsername: telegramUsername });
            if (existingTelegramUsernameUser && existingTelegramUsernameUser._id.toString() !== user._id.toString()) {
                console.warn(`Attempt to link already used Telegram username: @${telegramUsername} to user ${user._id}. Already linked to ${existingTelegramUsernameUser._id}`);
                return res.status(409).json({ message: "This Telegram username is already linked to another FOMO account." });
            }
            console.warn(`Attempt to link already used Telegram ID: ${telegramUserId} to user ${user._id}. Already linked to ${existingTelegramUser._id}`);
            return res.status(409).json({ message: "This Telegram account is already linked to another FOMO user." });
        }
        
        user.telegramUserId = telegramUserId;
        user.telegramUsername = telegramUsername;
        user.telegramFirstName = telegramFirstName;
        user.telegramLastName = telegramLastName;
        user.telegramPhotoUrl = telegramPhotoUrl;

        await user.save();
        await TelegramVerification.deleteOne({ _id: pendingVerification._id });
        
        res.status(200).json({ message: "Telegram account linked successfully!" });

    } catch (error) {
        console.error("Error completing Telegram verification:", error);
        res.status(500).json({ message: "Server error completing Telegram verification." });
    }
};

exports.trackMessage = async (req, res) => {
    const botSecret = req.headers['x-bot-secret'];
    
    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`[Backend trackMessage] Unauthorized attempt to track message from IP: ${req.ip}`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret." });
    }

    const { telegramChatId, telegramMessageId, telegramUserId, telegramUsername, messageContent, timestamp } = req.body;

    if (!telegramChatId || !telegramUserId || !messageContent) {
        console.warn(`[Backend trackMessage] Missing required tracking data: chatID=${telegramChatId}, userID=${telegramUserId}, content present=${!!messageContent}`);
        return res.status(400).json({ message: "Missing required tracking data (chat ID, user ID, content)." });
    }

    try {
        const user = await User.findOne({ telegramUserId: telegramUserId });
        if (!user) {
            return res.status(200).json({ message: "Telegram ID not linked to a FOMO account. Message not tracked for rewards." });
        }

        const campaign = await SparkCampaign.findOne({ telegramChatId: telegramChatId });
        if (!campaign) {
            return res.status(200).json({ message: "Group not associated with an active campaign. Message not tracked." });
        }

        if (campaign.status !== 'active') {
             return res.status(200).json({ message: "Campaign is not active, messages not tracked." });
        }

        let participation = await UserCampaignParticipation.findOne({
            userId: user._id,
            campaignId: campaign._id
        });

        if (!participation) {
            participation = new UserCampaignParticipation({
                userId: user._id,
                campaignId: campaign._id,
                telegramJoined: true, // If they sent a message, they must have joined
                lastTelegramMessageAt: new Date(timestamp),
                totalTelegramMessages: 1
            });
            
        } else {
            participation.telegramJoined = true; // Ensure this is true
            participation.lastTelegramMessageAt = new Date(timestamp);
            participation.totalTelegramMessages = (participation.totalTelegramMessages || 0) + 1;
            
        }

        await participation.save();

        campaign.totalMessagesTracked = (campaign.totalMessagesTracked || 0) + 1;
        
        const userIdString = user._id.toString();
        if (!campaign.uniqueUsersEngagedIds.includes(userIdString)) {
            campaign.uniqueUsersEngagedIds.push(userIdString);
            campaign.uniqueUsersEngagedCount = campaign.uniqueUsersEngagedIds.length;
        }

        await campaign.save();
        
        res.status(200).json({ message: "Message tracked successfully." });

    } catch (error) {
        console.error("[Backend trackMessage] Error tracking Telegram message:", error);
        res.status(500).json({ message: "Server error tracking Telegram message.", error: error.message });
    }
};

// --- MODIFIED Controller function for /link-campaign-group with security checks ---
exports.linkCampaignGroup = async (req, res) => {
    // Authenticate the bot first
    const botSecret = req.headers['x-bot-secret'];
    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`[Link Campaign] Unauthorized attempt from IP: ${req.ip} - Invalid bot secret.`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret." });
    }

    const { campaignId, telegramChatId, telegramUserId, telegramGroupLink } = req.body; // telegramUserId is now required from bot

    // 1. Basic Input Validation
    if (!campaignId || !telegramChatId || !telegramUserId) {
        console.log(`[Link Campaign] Missing required parameters. Received: ${JSON.stringify(req.body)}`);
        return res.status(400).json({ message: 'Missing required parameters: campaignId, telegramChatId, and telegramUserId.' });
    }

    // Validate campaignId format
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        console.log(`[Link Campaign] Invalid campaign ID format: ${campaignId}`);
        return res.status(400).json({ message: 'Invalid campaign ID format.' });
    }

    try {
        // 2. Find the User who issued the command by their Telegram ID
        const user = await User.findOne({ telegramUserId: telegramUserId });

        if (!user) {
            console.log(`[Link Campaign] Telegram user ID ${telegramUserId} not found or not linked to a FOMO account.`);
            return res.status(403).json({ message: "Your Telegram account is not linked to FOMO. Please link it via the FOMO website first." });
        }

        // 3. Find the Spark Campaign using the provided campaignId
        const sparkCampaign = await SparkCampaign.findById(campaignId);

        if (!sparkCampaign) {
            console.log(`[Link Campaign] SparkCampaign not found with ID: ${campaignId}`);
            return res.status(404).json({ message: 'SparkCampaign not found.' });
        }

        // 4. **CRUCIAL AUTHORIZATION CHECK: Verify Campaign Ownership**
        // Ensure the user trying to link the campaign is its actual creator
        if (sparkCampaign.creatorId.toString() !== user._id.toString()) {
            console.warn(`[Link Campaign] Unauthorized attempt: User ${user._id} (Telegram: ${telegramUserId}) tried to link campaign ${campaignId} (Creator: ${sparkCampaign.creatorId}).`);
            return res.status(403).json({
                message: "Unauthorized: You are not the creator of this campaign. Only the campaign creator can link a Telegram group."
            });
        }

        // 5. Check for existing links of this Telegram chat ID
        const existingCampaignWithThisChatId = await SparkCampaign.findOne({ telegramChatId: telegramChatId });
        if (existingCampaignWithThisChatId) {
            if (existingCampaignWithThisChatId._id.toString() === campaignId) {
                // If the same campaign is being linked to the same group again
                console.log(`[Link Campaign] Group ${telegramChatId} is already linked to campaign ${campaignId}. No change needed.`);
                return res.status(200).json({ message: 'This Telegram group is already linked to this SparkCampaign.' });
            } else {
                // If the group is already linked to a DIFFERENT campaign
                console.warn(`[Link Campaign] Telegram group ${telegramChatId} is already linked to another campaign: ${existingCampaignWithThisChatId._id}`);
                return res.status(409).json({ message: 'This Telegram group is already linked to another Spark Campaign.' });
            }
        }

        // 6. Proceed with linking the Campaign to the Telegram Group
        sparkCampaign.telegramChatId = telegramChatId;
        if (telegramGroupLink) {
            sparkCampaign.telegramGroupLink = telegramGroupLink;
        }

        // Optional: Update campaign status if linking activates it
        // Example: if (sparkCampaign.status === 'pending') { sparkCampaign.status = 'active'; /* set startDate, endDate */ }

        await sparkCampaign.save(); // Save the updated SparkCampaign document

        console.log(`[Link Campaign] SparkCampaign ${campaignId} successfully linked to Telegram group ${telegramChatId}.`);
        res.status(200).json({ message: 'SparkCampaign successfully linked to Telegram group.', sparkCampaign });

    } catch (error) {
        console.error('[Backend] Error linking SparkCampaign to Telegram group:', error);
        // More specific error handling can be added here if needed (e.g., Mongoose validation errors)
        res.status(500).json({ message: 'An internal server error occurred while linking the SparkCampaign.' });
    }
};