




require('dotenv').config({ path: '../.env' });


const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios'); // For making HTTP requests to your backend
const https = require('https'); // Required for creating a custom HTTPS agent (only for dev)


const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET_BOT_API_KEY = process.env.SECRET_BOT_API_KEY;



const COMPLETE_VERIFICATION_URL_FROM_ENV = process.env.BACKEND_API_URL;



const BASE_API_ROOT = COMPLETE_VERIFICATION_URL_FROM_ENV ?
    COMPLETE_VERIFICATION_URL_FROM_ENV.substring(0, COMPLETE_VERIFICATION_URL_FROM_ENV.indexOf('/api/telegram/complete-verification')) :
    null; // Handle case where env var might be missing


const TRACKING_API_URL = `${BASE_API_ROOT}/api/spark-campaigns/track-message`;
const LINK_CAMPAIGN_GROUP_API_URL = `${BASE_API_ROOT}/api/telegram/link-campaign-group`;
const REACTION_TRACKING_API_URL = `${BASE_API_ROOT}/api/spark-campaigns/track-reaction`;
const GET_USER_EARNINGS_API_URL = `${BASE_API_ROOT}/api/users/earnings`;




const agent = process.env.NODE_ENV !== 'production' ?
    new https.Agent({ rejectUnauthorized: false }) :
    null; // In production, don't use a custom agent (rely on default Node.js HTTPS behavior)


if (!TOKEN) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not set in environment variables!");
    process.exit(1); // Exit if token is missing
}
if (!SECRET_BOT_API_KEY) {
    console.error("Error: SECRET_BOT_API_KEY is not set in environment variables! Bot cannot authenticate with backend.");
    process.exit(1);
}
if (!COMPLETE_VERIFICATION_URL_FROM_ENV) {
    console.error("Error: BACKEND_API_URL (used for verification) is not set in environment variables!");
    process.exit(1);
}
if (!BASE_API_ROOT || !TRACKING_API_URL || !LINK_CAMPAIGN_GROUP_API_URL || !REACTION_TRACKING_API_URL || !GET_USER_EARNINGS_API_URL) {
    console.error("Error: API URLs not correctly derived. Check BACKEND_API_URL in .env (or Render env vars).");
    process.exit(1);
}





const bot = new TelegramBot(TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        allowed_updates: ["message", "message_reaction", "chat_member"]
    }
});


async function setBotCommands() {
    try {
        await bot.setMyCommands([
            { command: 'start', description: 'Start interaction or link account' },
            { command: 'add', description: 'Link this group to a campaign (Group chat only)' },
            { command: 'mybalance', description: 'Check your earnings (Private chat only)' }
            // Add other commands as you introduce them
        ]);
        console.log('Telegram bot commands set successfully.');
    } catch (error) {
        console.error('Failed to set Telegram bot commands:', error);
    }
}

setBotCommands();

async function sendToBackendForTracking(data) {
    try {
        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                'x-bot-secret': SECRET_BOT_API_KEY
            }
        };
        if (agent) { // Only use agent if it's defined (i.e., not in production)
            requestOptions.httpsAgent = agent;
        }

        const response = await axios.post(TRACKING_API_URL, data, requestOptions);
        
    } catch (error) {
        console.error(`[Bot] Error sending message tracking data to backend for user @${data.telegramUsername || data.telegramUserId} in chat ${data.telegramChatId}:`);
        console.error(`\tError Message: ${error.message}`);
        if (error.response) {
            console.error(`\tBackend Response Status: ${error.response.status}`);
            console.error(`\tBackend Response Data:`, error.response.data);
        }
    }
}


async function sendToBackendForReactionTracking(data) {
    try {
        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                'x-bot-secret': SECRET_BOT_API_KEY
            }
        };
        if (agent) { // Only use agent if it's defined (i.e., not in production)
            requestOptions.httpsAgent = agent;
        }

        const response = await axios.post(REACTION_TRACKING_API_URL, data, requestOptions);
        
    } catch (error) {
        console.error(`[Bot] Error sending reaction tracking data to backend for user @${data.telegramUsername || data.telegramUserId} in chat ${data.telegramChatId}:`);
        console.error(`\tError Message: ${error.message}`);
        if (error.response) {
            console.error(`\tBackend Response Status: ${error.response.status}`);
            console.error(`\tBackend Response Data:`, error.response.data);
        }
    }
}



async function sendChatIdToBackend(campaignId, telegramChatId, telegramGroupLink = null) {
    try {
        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                'x-bot-secret': SECRET_BOT_API_KEY // Crucial for bot authentication
            }
        };
        if (agent) { // Only use agent if it's defined (i.e., not in production)
            requestOptions.httpsAgent = agent;
        }

        const response = await axios.post(LINK_CAMPAIGN_GROUP_API_URL, {
            campaignId,
            telegramChatId,
            telegramGroupLink
        }, requestOptions);
        
        return true;
    } catch (error) {
        console.error(`[Bot] Error sending chat ID ${telegramChatId} for campaign ${campaignId} to backend:`);
        console.error(`\tError Message: ${error.message}`);
        if (error.response) {
            console.error(`\tBackend Response Status: ${error.response.status}`);
            console.error(`\tBackend Response Data:`, error.response.data);
        }
        return false;
    }
}





bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fullPayload = match[1]; // This will be something like 'verify_7UuueKfw'


    if (!fullPayload || fullPayload.trim() === '') {
        bot.sendMessage(chatId, "Welcome to AtfomoBot! To link your account, please go to the FOMO website and use the 'Link Telegram Account' button. If you have a verification code, you can send it like: `/start your_code_here`");
        
        return; // Exit this handler as it's meant for payloads
    }

    

    const expectedPrefix = 'verify_';

    if (!fullPayload.trim().startsWith(expectedPrefix)) {
        bot.sendMessage(chatId, "Please use the verification link from the FOMO website or enter the correct code after /start. Ensure the code is exactly as provided.");
        return;
    }

    const verificationCode = fullPayload.trim().substring(expectedPrefix.length); // Trim again to be safe


    if (!verificationCode) {
        bot.sendMessage(chatId, "Invalid verification code format. The code cannot be empty. Please try again.");
        return;
    }


    const dataToSend = {
        verificationCode: verificationCode,
        telegramUserId: String(msg.from.id), // Ensure it's a string to match Mongoose schema type
        telegramUsername: msg.from.username || null,
        telegramFirstName: msg.from.first_name || null,
        telegramLastName: msg.from.last_name || null,
        telegramPhotoUrl: null // Set to null initially, or implement fetching logic if needed
    };

    

    try {
        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                'x-bot-secret': SECRET_BOT_API_KEY // CRITICAL: Authenticate bot with your backend
            }
        };
        if (agent) { // Only use agent if it's defined (i.e., not in production)
            requestOptions.httpsAgent = agent;
        }

        const response = await axios.post(COMPLETE_VERIFICATION_URL_FROM_ENV, dataToSend, requestOptions);

        if (response.status === 200) {
            bot.sendMessage(chatId, "🎉 Your Telegram account has been successfully linked to FOMO!");
            
        } else {

            bot.sendMessage(chatId, `Verification failed: ${response.data.message || 'Unknown error.'}`);
            console.warn(`[Bot] Backend returned non-200 status: ${response.status} - ${response.data.message}`);
        }

    } catch (error) {
        console.error(`[Bot] Error calling backend for verification for user ${msg.from.username || msg.from.id}:`);
        console.error("     Error Message:", error.message);
        if (error.response) {
            console.error("     Backend Response Status:", error.response.status);
            console.error("     Backend Response Data:", error.response.data);
            let userFacingError = error.response.data.message || 'Server responded with an error.';
            bot.sendMessage(chatId, `Verification failed: ${userFacingError}`);
        } else {
            bot.sendMessage(chatId, "An error occurred during verification. Please try again or contact support.");
        }
    }
});



bot.onText(/\/start$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome to AtfomoBot! To link your account, please go to the FOMO website and use the 'Link Telegram Account' button. If you have a verification code, you can send it like: `/start your_code_here`");
    
});


// New command: /add
bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const args = match[1].split(' '); // Get arguments after the command

    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return bot.sendMessage(chatId, 'This command can only be used inside a Telegram group that you want to link to a campaign.');
    }

    if (args.length !== 1) {
        // Update usage message
        return bot.sendMessage(chatId, 'Usage: `/add <campaign_id>`\nExample: `/add 685cebcf3a5881b2dde705a9`');
    }

    const campaignId = args[0].trim();

    if (!/^[0-9a-fA-F]{24}$/.test(campaignId)) {
        return bot.sendMessage(chatId, 'Invalid campaign ID format. Please provide a valid 24-character hexadecimal ID.');
    }

    let telegramGroupLink = null; // Default to null

    if (msg.chat.username) {
        telegramGroupLink = `https://t.me/${msg.chat.username}`;
    }

    const success = await sendChatIdToBackend(campaignId, chatId, telegramGroupLink);

    if (success) {
        bot.sendMessage(chatId, `✅ This group (Chat ID: \`${chatId}\`) has been successfully linked to campaign ID: \`${campaignId}\`. Messages will now be tracked!`, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ Failed to link this group (Chat ID: \`${chatId}\`) to campaign ID: \`${campaignId}\`. Please ensure the Campaign ID is correct, the bot is an admin in this group, and there are no conflicts.`, { parse_mode: 'Markdown' });
    }
});


bot.onText(/\/mybalance(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from.id); // Get the Telegram user ID
    const optionalCampaignId = match[1] ? match[1].trim() : null; // Capture optional campaign ID

    if (msg.chat.type !== 'private') {
        // Update message for private chat
        return bot.sendMessage(chatId, 'Please use the `/mybalance` command in a private chat with me for your privacy.');
    }

    try {
        let apiUrl = `${GET_USER_EARNINGS_API_URL}?telegramUserId=${telegramUserId}`;
        if (optionalCampaignId) {
            // Update usage message
            if (!/^[0-9a-fA-F]{24}$/.test(optionalCampaignId)) {
                return bot.sendMessage(chatId, 'Invalid campaign ID format. Please provide a valid 24-character hexadecimal ID after `/mybalance`.');
            }
            apiUrl += `&campaignId=${optionalCampaignId}`;
        }

        const requestOptions = {
            headers: {
                'x-bot-secret': SECRET_BOT_API_KEY // Authenticate bot with your backend
            }
        };
        if (agent) { // Only use agent if it's defined (i.e., not in production)
            requestOptions.httpsAgent = agent;
        }

        const response = await axios.get(apiUrl, requestOptions);

        const earningsData = response.data;
        let replyMessage = '';

        if (earningsData.totalOverallEarnings > 0) {
            if (optionalCampaignId) {
                replyMessage = `💰 *Your Earnings for Campaign ${optionalCampaignId}:*\n`;
            } else {
                replyMessage = `💰 *Your Total Earnings Across All Campaigns:*\n`;
            }

            earningsData.details.forEach(detail => {
                replyMessage += `- Total: *$${detail.totalEarnings.toFixed(2)} ${detail.currency}*\n`;
                if (detail.totalMessages > 0) {
                    replyMessage += `  - Messages: ${detail.totalMessages}\n`;
                }
                if (detail.totalReactions > 0) {
                    replyMessage += `  - Reactions: ${detail.totalReactions}\n`;
                }
            });

            replyMessage += `\nKeep up the great work! 🎉`;

        } else {
            replyMessage = optionalCampaignId
                ? `You currently have no earnings for campaign \`${optionalCampaignId}\`.`
                : `You currently have no earnings across any campaigns. Start participating in active campaigns!`;
        }

        bot.sendMessage(chatId, replyMessage, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error(`[Bot] Error fetching earnings for user ${telegramUserId}:`);
        console.error(`\tError Message: ${error.message}`);
        if (error.response) {
            console.error(`\tBackend Response Status: ${error.response.status}`);
            console.error(`\tBackend Response Data:`, error.response.data);
            if (error.response.status === 404 && error.response.data.message.includes("Telegram user not found")) {
                bot.sendMessage(chatId, "It looks like your Telegram account is not linked to FOMO. Please link it via the FOMO website first!");
            } else {
                bot.sendMessage(chatId, `An error occurred while fetching your earnings: ${error.response.data.message || 'Please try again later.'}`);
            }
        } else {
            bot.sendMessage(chatId, "An unexpected error occurred while trying to fetch your earnings. Please try again later.");
        }
    }
});



bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const messageId = msg.message_id;
    const fromUser = msg.from; // Sender of the message



    if (messageText && messageText.startsWith('/') || fromUser.is_bot || !messageText) {
        return;
    }


    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        


        const dataToTrack = {
            telegramChatId: String(chatId), // Convert to string for consistency
            telegramMessageId: String(messageId),
            telegramUserId: String(fromUser.id),
            telegramUsername: fromUser.username || null,
            telegramFirstName: fromUser.first_name || null,
            telegramLastName: fromUser.last_name || null,
            messageContent: messageText,
            timestamp: new Date(msg.date * 1000).toISOString(), // Convert Unix timestamp to ISO string


        };

        


        await sendToBackendForTracking(dataToTrack); // Call the helper function

    } else if (msg.chat.type === 'private') {

        bot.sendMessage(chatId, "I'm a verification and campaign tracking bot for Atfomo. To link your account, use `/start your_code_here`. I also monitor messages in linked campaign groups for rewards!");
        
    } else {
        
    }
});


bot.on('message_reaction', async (reactionUpdate) => {
    

    const { chat, user, message_id, old_reaction, new_reaction } = reactionUpdate;


    if (user.is_bot || (chat.type !== 'group' && chat.type !== 'supergroup')) {
        return;
    }


    const addedReactions = new_reaction.filter(
        newReact => !old_reaction.some(oldReact =>
            oldReact.type === newReact.type &&
            (oldReact.type === 'emoji' ? oldReact.emoji === newReact.emoji : oldReact.custom_emoji_id === newReact.custom_emoji_id)
        )
    );


    if (addedReactions.length > 0) {
        

        for (const reaction of addedReactions) {
            const reactionData = {
                telegramChatId: String(chat.id),
                telegramMessageId: String(message_id),
                telegramUserId: String(user.id),
                telegramUsername: user.username || null,
                telegramFirstName: user.first_name || null,
                telegramLastName: user.last_name || null,
                reactionType: reaction.type, // e.g., 'emoji', 'custom_emoji'
                reactionEmoji: reaction.type === 'emoji' ? reaction.emoji : null,
                reactionCustomEmojiId: reaction.type === 'custom_emoji' ? reaction.custom_emoji_id : null,
                timestamp: new Date().toISOString() // Current time, as reactionUpdate doesn't have its own timestamp for the reaction itself
            };
            
            await sendToBackendForReactionTracking(reactionData);
        }
    } else {
        
    }
});



bot.on('polling_error', (error) => {
    console.error(`[Bot] Polling error: ${error.code} - ${error.message}`);
});


bot.on('webhook_error', (error) => {
    console.error(`[Bot] Webhook error: ${error.code} - ${error.message}`);
});


bot.on('error', (error) => {
    console.error(`[Bot] General bot error: ${error.message}`);
});