
const User = require('../models/User'); // Assuming User model is available




const SECRET_BOT_API_KEY = process.env.SECRET_BOT_API_KEY;

exports.trackMessage = async (req, res) => {

    const botSecret = req.headers['x-bot-secret'];
    
    

    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`Unauthorized attempt to track message from IP: ${req.ip}`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret for tracking." });
    }


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


    if (!telegramChatId || !telegramUserId || !messageContent || !timestamp) {
        console.warn('Missing required data for message tracking:', req.body);
        return res.status(400).json({ message: "Missing required data for message tracking." });
    }








    
    
    
    
    

    try {

        const user = await User.findOne({ telegramUserId: telegramUserId });
        if (!user) {
            console.warn(`[Backend] Message from unlinked Telegram user ID: ${telegramUserId}`);


            return res.status(200).json({ message: "Message received, but user is not linked to a FOMO account." });
        }









        


        res.status(200).json({ message: "Message received and processed for tracking." });

    } catch (error) {
        console.error("Error in trackMessage:", error);
        res.status(500).json({ message: "Server error during message tracking." });
    }
};