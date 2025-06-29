// server/telegramBot/bot.js

// Load environment variables from the .env file.
// In production on Render, these should be set directly in Render's environment variables.
// This line is primarily for local development.
require('dotenv').config({ path: '../.env' });
console.log('Bot is using SECRET_BOT_API_KEY:', process.env.SECRET_BOT_API_KEY ? 'Present' : 'Absent');

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios'); // For making HTTP requests to your backend
const https = require('https'); // Required for creating a custom HTTPS agent (only for dev)

// --- Configuration ---
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET_BOT_API_KEY = process.env.SECRET_BOT_API_KEY;

// IMPORTANT: This variable MUST be set correctly in Render's environment variables for production.
// It should be 'https://api.atfomo.com/api/telegram/complete-verification' in production.
const COMPLETE_VERIFICATION_URL_FROM_ENV = process.env.BACKEND_API_URL;

// Derive the true base API URL from the complete verification URL.
// This logic assumes the complete verification URL always ends with '/api/telegram/complete-verification'.
const BASE_API_ROOT = COMPLETE_VERIFICATION_URL_FROM_ENV ?
    COMPLETE_VERIFICATION_URL_FROM_ENV.substring(0, COMPLETE_VERIFICATION_URL_FROM_ENV.indexOf('/api/telegram/complete-verification')) :
    null; // Handle case where env var might be missing

// Now define all specific API endpoints using the derived BASE_API_ROOT
const TRACKING_API_URL = `${BASE_API_ROOT}/api/spark-campaigns/track-message`;
const LINK_CAMPAIGN_GROUP_API_URL = `${BASE_API_ROOT}/api/telegram/link-campaign-group`;
const REACTION_TRACKING_API_URL = `${BASE_API_ROOT}/api/spark-campaigns/track-reaction`;
const GET_USER_EARNINGS_API_URL = `${BASE_API_ROOT}/api/users/earnings`;

// --- Create an HTTPS agent to bypass SSL certificate validation for local development ---
// WARNING: This should ONLY be used in development. Do NOT use in production.
// Conditional agent usage: only use if not in production
const agent = process.env.NODE_ENV !== 'production' ?
    new https.Agent({ rejectUnauthorized: false }) :
    null; // In production, don't use a custom agent (rely on default Node.js HTTPS behavior)

// Check for critical environment variables
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


// Create a bot that uses 'polling' to fetch new updates
// Polling is good for development and can work for simple production deployments.
// For larger scale, consider webhooks.
const bot = new TelegramBot(TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        allowed_updates: ["message", "message_reaction", "chat_member"]
    }
});

console.log('Telegram bot started and polling for updates...');

// --- Helper Functions to send to backend ---

// Function to send message tracking data to your backend
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
        console.log(`[Bot] Successfully sent message tracking data to backend for user @${data.telegramUsername || data.telegramUserId} in chat ${data.telegramChatId}`);
    } catch (error) {
        console.error(`[Bot] Error sending message tracking data to backend for user @${data.telegramUsername || data.telegramUserId} in chat ${data.telegramChatId}:`);
        console.error(`\tError Message: ${error.message}`);
        if (error.response) {
            console.error(`\tBackend Response Status: ${error.response.status}`);
            console.error(`\tBackend Response Data:`, error.response.data);
        }
    }
}

// Function to send reaction tracking data to your backend
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
        console.log(`[Bot] Successfully sent reaction tracking data to backend for user @${data.telegramUsername || data.telegramUserId} in chat ${data.telegramChatId}`);
    } catch (error) {
        console.error(`[Bot] Error sending reaction tracking data to backend for user @${data.telegramUsername || data.telegramUserId} in chat ${data.telegramChatId}:`);
        console.error(`\tError Message: ${error.message}`);
        if (error.response) {
            console.error(`\tBackend Response Status: ${error.response.status}`);
            console.error(`\tBackend Response Data:`, error.response.data);
        }
    }
}


// Function for the bot to send chat ID to backend to link with a campaign
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
        console.log(`[Bot] Successfully sent chat ID ${telegramChatId} for campaign ${campaignId} to backend:`, response.data.message);
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


// --- Message Handlers ---

// Listen for the /start command, potentially with a payload (e.g., /start verify_CODE)
bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fullPayload = match[1]; // This will be something like 'verify_7UuueKfw'

    // Handle cases where /start is sent without a payload (e.g., plain /start)
    if (!fullPayload || fullPayload.trim() === '') {
        bot.sendMessage(chatId, "Welcome to AtfomoBot! To link your account, please go to the FOMO website and use the 'Link Telegram Account' button. If you have a verification code, you can send it like: `/start your_code_here`");
        console.log(`[Bot] Received plain /start command via onText(/\\/start (.+)/) from ${msg.from.username || msg.from.id}.`);
        return; // Exit this handler as it's meant for payloads
    }

    console.log(`[Bot] Received /start command from ${msg.from.username || msg.from.id} with payload: ${fullPayload}`);

    const expectedPrefix = 'verify_';
    // Check if the payload starts with the expected prefix after trimming whitespace
    if (!fullPayload.trim().startsWith(expectedPrefix)) {
        bot.sendMessage(chatId, "Please use the verification link from the FOMO website or enter the correct code after /start. Ensure the code is exactly as provided.");
        return;
    }

    const verificationCode = fullPayload.trim().substring(expectedPrefix.length); // Trim again to be safe

    // Additional check for empty code after stripping prefix
    if (!verificationCode) {
        bot.sendMessage(chatId, "Invalid verification code format. The code cannot be empty. Please try again.");
        return;
    }

    // Prepare data to send to your backend
    const dataToSend = {
        verificationCode: verificationCode,
        telegramUserId: String(msg.from.id), // Ensure it's a string to match Mongoose schema type
        telegramUsername: msg.from.username || null,
        telegramFirstName: msg.from.first_name || null,
        telegramLastName: msg.from.last_name || null,
        telegramPhotoUrl: null // Set to null initially, or implement fetching logic if needed
    };

    console.log('Bot is sending x-bot-secret to verification endpoint:', SECRET_BOT_API_KEY ? 'Present' : 'Absent');

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
        // Call your backend's complete-verification endpoint
        const response = await axios.post(COMPLETE_VERIFICATION_URL_FROM_ENV, dataToSend, requestOptions);

        if (response.status === 200) {
            bot.sendMessage(chatId, "🎉 Your Telegram account has been successfully linked to FOMO!");
            console.log(`[Bot] Successfully linked Telegram @${msg.from.username || msg.from.id} to backend.`);
        } else {
            // This part might not be hit often if axios throws on non-2xx status
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

// Listen for a plain /start command (without payload)
// This handler ensures a friendly message for users just starting the bot.
bot.onText(/\/start$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome to AtfomoBot! To link your account, please go to the FOMO website and use the 'Link Telegram Account' button. If you have a verification code, you can send it like: `/start your_code_here`");
    console.log(`[Bot] Received plain /start command from ${msg.from.username || msg.from.id}.`);
});

// ⭐ NEW COMMAND: /linkcampaign ⭐
bot.onText(/\/linkcampaign (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const args = match[1].split(' '); // Get arguments after the command

    // Only allow this command in groups/supergroups
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return bot.sendMessage(chatId, 'This command can only be used inside a Telegram group that you want to link to a campaign.');
    }

    if (args.length !== 1) {
        return bot.sendMessage(chatId, 'Usage: `/linkcampaign <campaign_id>`\nExample: `/linkcampaign 685cebcf3a5881b2dde705a9`');
    }

    const campaignId = args[0].trim();

    // Validate if campaignId looks like a valid ObjectId (optional, but good)
    if (!/^[0-9a-fA-F]{24}$/.test(campaignId)) {
        return bot.sendMessage(chatId, 'Invalid campaign ID format. Please provide a valid 24-character hexadecimal ID.');
    }

    let telegramGroupLink = null; // Default to null

    // Attempt to get a public link if the group has a username
    if (msg.chat.username) {
        telegramGroupLink = `https://t.me/${msg.chat.username}`;
    }

    console.log(`[Bot] Attempting to link group ${chatId} to campaign ${campaignId}.`);
    const success = await sendChatIdToBackend(campaignId, chatId, telegramGroupLink);

    if (success) {
        bot.sendMessage(chatId, `✅ This group (Chat ID: \`${chatId}\`) has been successfully linked to campaign ID: \`${campaignId}\`. Messages will now be tracked!`, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ Failed to link this group (Chat ID: \`${chatId}\`) to campaign ID: \`${campaignId}\`. Please ensure the Campaign ID is correct, the bot is an admin in this group, and there are no conflicts.`, { parse_mode: 'Markdown' });
    }
});

// ⭐ NEW COMMAND: /myrewards ⭐
// Allows a user to check their earnings in a private chat with the bot.
// Format: /myrewards [campaign_id]
bot.onText(/\/myrewards(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from.id); // Get the Telegram user ID
    const optionalCampaignId = match[1] ? match[1].trim() : null; // Capture optional campaign ID

    // Ensure this command is used in a private chat for privacy
    if (msg.chat.type !== 'private') {
        return bot.sendMessage(chatId, 'Please use the `/myrewards` command in a private chat with me for your privacy.');
    }

    console.log(`[Bot] User ${msg.from.username || telegramUserId} requested /myrewards. Optional campaign ID: ${optionalCampaignId || 'None'}`);

    try {
        let apiUrl = `${GET_USER_EARNINGS_API_URL}?telegramUserId=${telegramUserId}`;
        if (optionalCampaignId) {
            // Basic validation for campaign ID format
            if (!/^[0-9a-fA-F]{24}$/.test(optionalCampaignId)) {
                return bot.sendMessage(chatId, 'Invalid campaign ID format. Please provide a valid 24-character hexadecimal ID after `/myrewards`.');
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
                    replyMessage += `  - Messages: ${detail.totalMessages}\n`;
                }
                if (detail.totalReactions > 0) {
                    replyMessage += `  - Reactions: ${detail.totalReactions}\n`;
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


// ⭐⭐⭐ MODIFIED: Listen for ALL messages in groups ⭐⭐⭐
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const messageId = msg.message_id;
    const fromUser = msg.from; // Sender of the message

    // Ignore messages that are commands (already handled by bot.onText)
    // and also ignore messages sent by other bots or if the text is empty/undefined.
    if (messageText && messageText.startsWith('/') || fromUser.is_bot || !messageText) {
        return;
    }

    // Check if the message is from a group or supergroup
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        console.log(`[Bot] Captured group message in chat ID ${chatId}: "${messageText}" from @${fromUser.username || fromUser.id}`);

        // --- Extract necessary data for backend ---
        const dataToTrack = {
            telegramChatId: String(chatId), // Convert to string for consistency
            telegramMessageId: String(messageId),
            telegramUserId: String(fromUser.id),
            telegramUsername: fromUser.username || null,
            telegramFirstName: fromUser.first_name || null,
            telegramLastName: fromUser.last_name || null,
            messageContent: messageText,
            timestamp: new Date(msg.date * 1000).toISOString(), // Convert Unix timestamp to ISO string
            // Add other data like message entities (for links) if needed later
            // entities: msg.entities // Contains info about links, mentions, hashtags etc.
        };

        console.log(`[Bot] Data prepared for tracking:`, dataToTrack);

        // ⭐⭐⭐ Send this data to your backend's new tracking API endpoint ⭐⭐⭐
        await sendToBackendForTracking(dataToTrack); // Call the helper function

    } else if (msg.chat.type === 'private') {
        // If it's a private message and not a command, respond generally
        bot.sendMessage(chatId, "I'm a verification and campaign tracking bot for Atfomo. To link your account, use `/start your_code_here`. I also monitor messages in linked campaign groups for rewards!");
        console.log(`[Bot] Received private non-command message from ${fromUser.username || fromUser.id}: "${messageText}"`);
    } else {
        console.log(`[Bot] Received message of type ${msg.chat.type} (unhandled): "${messageText}" from @${fromUser.username || fromUser.id}`);
    }
});

// --- NEW: Message Reaction Handler ---
bot.on('message_reaction', async (reactionUpdate) => {
    console.log('[Bot] Received message reaction update:', JSON.stringify(reactionUpdate, null, 2));

    const { chat, user, message_id, old_reaction, new_reaction } = reactionUpdate;

    // We are interested in reactions added by actual users, not bots, and only in groups
    if (user.is_bot || (chat.type !== 'group' && chat.type !== 'supergroup')) {
        return;
    }

    // Determine if new reactions were added
    const addedReactions = new_reaction.filter(
        newReact => !old_reaction.some(oldReact =>
            oldReact.type === newReact.type &&
            (oldReact.type === 'emoji' ? oldReact.emoji === newReact.emoji : oldReact.custom_emoji_id === newReact.custom_emoji_id)
        )
    );

    // If a reaction was removed, `addedReactions` will be empty. We only care about additions for now.
    if (addedReactions.length > 0) {
        console.log(`[Bot] User ${user.username || user.first_name} added a reaction to message ${message_id} in chat ${chat.id}. Added reactions:`, addedReactions.map(r => r.type === 'emoji' ? r.emoji : r.type).join(', '));

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
            console.log(`[Bot] Data prepared for reaction tracking:`, reactionData);
            await sendToBackendForReactionTracking(reactionData);
        }
    } else {
        console.log(`[Bot] Reaction update from user ${user.username || user.first_name} in chat ${chat.id} was not an 'add' event (likely a removal or change).`);
    }
});


// Error handling for polling issues
bot.on('polling_error', (error) => {
    console.error(`[Bot] Polling error: ${error.code} - ${error.message}`);
});

// Error handling for webhook issues (if you switch to webhooks later)
bot.on('webhook_error', (error) => {
    console.error(`[Bot] Webhook error: ${error.code} - ${error.message}`);
});

// General bot error handling
bot.on('error', (error) => {
    console.error(`[Bot] General bot error: ${error.message}`);
});