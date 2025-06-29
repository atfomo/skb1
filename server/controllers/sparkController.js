// server/controllers/sparkController.js
const User = require('../models/User'); // Assuming User model is available
// You'll eventually need Campaign and Action models here
// const Campaign = require('../models/Campaign');
// const Action = require('../models/Action');

const SECRET_BOT_API_KEY = process.env.SECRET_BOT_API_KEY;

exports.trackMessage = async (req, res) => {
    // 1. Authenticate the bot using the secret header
    const botSecret = req.headers['x-bot-secret'];
    console.log('Backend expects SECRET_BOT_API_KEY (from env):', SECRET_BOT_API_KEY);
    console.log('Backend received x-bot-secret header (for tracking):', botSecret);

    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`Unauthorized attempt to track message from IP: ${req.ip}`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret for tracking." });
    }

    // 2. Extract data from the bot's request body
    const {
        telegramChatId,
        telegramMessageId,
        telegramUserId,
        telegramUsername,
        telegramFirstName,
        telegramLastName,
        messageContent,
        timestamp
    } = req.body;

    // Basic validation of incoming data
    if (!telegramChatId || !telegramUserId || !messageContent || !timestamp) {
        console.warn('Missing required data for message tracking:', req.body);
        return res.status(400).json({ message: "Missing required data for message tracking." });
    }

    // ⭐ Placeholder for Anti-Fraud / Anti-Spam / Campaign Validation ⭐
    // In future steps, this is where you'll:
    //   - Find the campaign associated with telegramChatId
    //   - Check if the campaign is active and has budget
    //   - Implement anti-spam rules (e.g., message length, frequency, repetition)
    //   - Check if the user (telegramUserId) is linked to a valid FOMO account
    //   - Check against fraudulent behavior
    console.log(`[Backend] Received message for tracking:`);
    console.log(`   Chat ID: ${telegramChatId}`);
    console.log(`   User ID: ${telegramUserId} (@${telegramUsername})`);
    console.log(`   Content: "${messageContent}"`);
    console.log(`   Timestamp: ${timestamp}`);

    try {
        // Optional: Find the user in your database to ensure they are linked
        const user = await User.findOne({ telegramUserId: telegramUserId });
        if (!user) {
            console.warn(`[Backend] Message from unlinked Telegram user ID: ${telegramUserId}`);
            // You might want to log this or send a message back to the user via the bot
            // "Please link your Telegram account to earn rewards."
            return res.status(200).json({ message: "Message received, but user is not linked to a FOMO account." });
        }

        // ⭐ TODO: Implement actual reward processing and database saving here ⭐
        // Example:
        // 1. Find active campaign for telegramChatId
        // 2. Apply anti-fraud rules
        // 3. Calculate earnings for this message (e.g., 0.01 per message)
        // 4. Update user.earnings and campaign.rewardPool
        // 5. Create a new Action log in a database collection

        console.log(`[Backend] Message from linked user ${user._id} processed. (Reward processing TODO)`);


        res.status(200).json({ message: "Message received and processed for tracking." });

    } catch (error) {
        console.error("Error in trackMessage:", error);
        res.status(500).json({ message: "Server error during message tracking." });
    }
};