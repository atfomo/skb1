// backend/controllers/sparkCampaignController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const SparkCampaign = require('../models/SparkCampaign');
const Action = require('../models/Action'); // Make sure you have this model
const Project = require('../models/Project'); // Correctly importing Project model
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const SECRET_BOT_API_KEY = process.env.SECRET_BOT_API_KEY;
const MESSAGE_REWARD_AMOUNT = 0.01;
const REACTION_REWARD_AMOUNT = 0.01; // Constant for Reaction Reward Amount

// --- Helper to extract Telegram Group/Channel ID (username or invite hash) ---
const extractTelegramGroupId = (link) => {
    if (!link) return null;

    // Regex for public channels/groups (e.g., https://t.me/some_channel_name)
    let match = link.match(/t\.me\/([a-zA-Z0-9_]+)$/);
    if (match && match[1]) {
        console.log(`Extracted public Telegram ID: ${match[1]}`);
        return match[1]; // Returns 'some_channel_name'
    }

    // Regex for joinchat links (e.g., https://t.me/joinchat/AAAAA...)
    // This extracts the base64-encoded invite hash. This can be used as a unique ID.
    match = link.match(/t\.me\/(?:joinchat\/)?([a-zA-Z0-9_-]+)$/);
    if (match && match[1]) {
        console.log(`Extracted invite hash Telegram ID: ${match[1]}`);
        return match[1]; // Returns the invite hash (e.g., 'AAAAA...')
    }

    console.warn(`Could not extract Telegram ID from link: ${link}`);
    return null; // Could not extract a suitable ID
};


// --- Helper for Input Validation ---
const validateSparkCampaignInput = (data, isUpdate = false) => {
    const errors = [];

    // Name validation
    if (!isUpdate || data.name !== undefined) {
        if (!data.name || data.name.trim().length < 3 || data.name.trim().length > 100) {
            errors.push("Campaign name is required and must be between 3 and 100 characters.");
        }
    }

    // Telegram Group Link validation
    if (!isUpdate || data.telegramGroupLink !== undefined) {
        if (!data.telegramGroupLink || !/^(https?:\/\/)?(www\.)?t\.me\/[a-zA-Z0-9_]+(\/[a-zA-Z0-9_]+)?\/?$/.test(data.telegramGroupLink)) {
            errors.push("Valid Telegram Group Link is required.");
        }
    }
    // Telegram Chat ID validation (derived from link)
    if (!isUpdate || data.telegramChatId !== undefined) {
        if (!data.telegramChatId || typeof data.telegramChatId !== 'string' || data.telegramChatId.trim() === '') {
            errors.push("Could not extract a unique Telegram Chat ID from the provided link. Please check the format.");
        }
    }

    // Tweet URL validation
    if (!isUpdate || data.tweetUrl !== undefined) {
        if (!data.tweetUrl || !/^(https?:\/\/)?(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+(\/)?$/.test(data.tweetUrl)) {
            errors.push("Valid X (Twitter) Tweet URL is required.");
        }
    }

    // Budget validation
    if (!isUpdate || data.budget !== undefined) {
        if (typeof data.budget !== 'number' || isNaN(data.budget) || data.budget < 1) {
            errors.push("Budget must be a positive number.");
        }
    }

    // Duration validation
    if (!isUpdate || data.durationHours !== undefined) {
        if (typeof data.durationHours !== 'number' || isNaN(data.durationHours) || data.durationHours < 1 || data.durationHours > 720) {
            errors.push("Duration must be a positive integer between 1 and 720 hours.");
        }
    }

    // Required Actions validation (basic type check)
    if (!isUpdate || data.requiredActions !== undefined) {
        if (typeof data.requiredActions !== 'object' || data.requiredActions === null) {
            errors.push("Required actions data is malformed.");
        }
        // Deeper validation of requiredActions can be added here if specific properties are expected
    }

    // Additional Instructions validation
    if (!isUpdate || data.additionalInstructions !== undefined) {
        if (data.additionalInstructions && data.additionalInstructions.length > 500) {
            errors.push("Additional instructions cannot exceed 500 characters.");
        }
    }

    // Hashtags validation
    if (data.hashtags !== undefined) {
        if (!Array.isArray(data.hashtags)) {
            errors.push("Hashtags must be an array of strings.");
        } else if (data.hashtags.some(tag => typeof tag !== 'string' || !tag.startsWith('#') || tag.length <= 1)) {
            errors.push("All hashtags must start with '#' and have content after the hash.");
        }
    }

    // Banner Image URL validation
    if (!isUpdate || data.bannerImageUrl !== undefined) {
        if (!data.bannerImageUrl || typeof data.bannerImageUrl !== 'string' || data.bannerImageUrl.trim() === '') {
            errors.push("Campaign banner image is required.");
        }
    }

    // Campaign Type validation
    if (data.campaignType && data.campaignType !== 'spark') {
        errors.push("Campaign type must be 'spark'.");
    }

    return errors;
};


// --- trackMessage ---
exports.trackMessage = async (req, res, next) => {
    const botSecret = req.headers['x-bot-secret'];
    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`Unauthorized attempt to track message from IP: ${req.ip}. Secret Mismatch.`);
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

    console.log(`[SparkCampaignController] Received message for tracking:`);
    console.log(`     Chat ID: ${telegramChatId}`);
    console.log(`     User ID: ${telegramUserId} (@${telegramUsername || 'N/A'})`);
    console.log(`     Content: "${messageContent.substring(0, Math.min(messageContent.length, 50))}..."`);
    console.log(`     Timestamp: ${timestamp}`);

    let responseMessage = "Message received and processed.";

    try {
        const sparkCampaign = await SparkCampaign.findOne({ telegramChatId: telegramChatId });

        if (!sparkCampaign) {
            console.warn(`[SparkCampaignController] No active Spark Campaign found for Telegram Chat ID: ${telegramChatId}. Skipping reward processing.`);
            responseMessage = "No active Spark Campaign found for this group.";
            return res.status(200).json({ message: responseMessage });
        }

        console.log(`[SparkCampaignController] Found Spark Campaign: "${sparkCampaign.name}" (ID: ${sparkCampaign._id})`);

        if (sparkCampaign.status !== 'active') {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" is not active (Status: ${sparkCampaign.status}). Skipping reward processing.`);
            responseMessage = `Campaign "${sparkCampaign.name}" is not active.`;
            return res.status(200).json({ message: responseMessage });
        }
        if (sparkCampaign.currentRewardPoolBalance <= 0) {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" has no remaining budget. Skipping reward processing.`);
            responseMessage = `Campaign "${sparkCampaign.name}" budget depleted.`;
            return res.status(200).json({ message: responseMessage });
        }
        if (sparkCampaign.endDate && new Date() > sparkCampaign.endDate) {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" has ended by time. Skipping reward processing.`);
            responseMessage = `Campaign "${sparkCampaign.name}" time has expired.`;
            return res.status(200).json({ message: responseMessage });
        }

        const user = await User.findOne({ telegramUserId: telegramUserId });
        if (!user) {
            console.warn(`[SparkCampaignController] Message from unlinked Telegram user ID: ${telegramUserId}. Skipping reward processing.`);
            responseMessage = "Message received, but user is not linked to a FOMO account.";
            return res.status(200).json({ message: responseMessage });
        }

        console.log(`[SparkCampaignController] Message from linked FOMO user ID: ${user._id} (@${user.username || 'N/A'}).`);

        if (messageContent.length < sparkCampaign.minMessageLength) {
            console.log(`[SparkCampaignController] Message too short (length ${messageContent.length}, min ${sparkCampaign.minMessageLength}). Skipping reward.`);
            responseMessage = "Message too short for reward.";
            return res.status(200).json({ message: responseMessage });
        }

        const lastMessageAction = await Action.findOne({
            userId: user._id,
            campaignId: sparkCampaign._id,
            actionType: 'message'
        }).sort({ timestamp: -1 });

        if (lastMessageAction) {
            const timeElapsed = (new Date().getTime() - lastMessageAction.timestamp.getTime()) / 1000;
            if (timeElapsed < sparkCampaign.messageCooldownSeconds) {
                console.log(`[SparkCampaignController] User ${user._id} is on message cooldown for campaign ${sparkCampaign._id}. Time elapsed: ${timeElapsed}s, Required: ${sparkCampaign.messageCooldownSeconds}s.`);
                responseMessage = `Message received, but user is on cooldown. Please wait ${sparkCampaign.messageCooldownSeconds - Math.floor(timeElapsed)} seconds.`;
                return res.status(200).json({ message: responseMessage });
            }
        }

        const reward = MESSAGE_REWARD_AMOUNT;

        if (sparkCampaign.currentRewardPoolBalance < reward) {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" does not have enough budget for a ${reward} message reward. Remaining: ${sparkCampaign.currentRewardPoolBalance}.`);
            responseMessage = `Campaign budget is too low for this reward.`;
            return res.status(200).json({ message: responseMessage });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            user.earnings = (user.earnings || 0) + reward;
            user.pendingEarnings = (user.pendingEarnings || 0) + reward;
            await user.save({ session });
            console.log(`[SparkCampaignController] User ${user._id} earnings updated. Total: ${user.earnings.toFixed(2)}, Pending: ${user.pendingEarnings.toFixed(2)}.`);

            sparkCampaign.currentRewardPoolBalance -= reward;
            sparkCampaign.totalMessagesTracked += 1;
            if (!sparkCampaign.uniqueUsersEngagedIds.includes(user._id)) {
                sparkCampaign.uniqueUsersEngagedIds.push(user._id);
                sparkCampaign.uniqueUsersEngagedCount = sparkCampaign.uniqueUsersEngagedIds.length;
            }
            await sparkCampaign.save({ session });
            console.log(`[SparkCampaignController] Campaign "${sparkCampaign.name}" reward pool updated to ${sparkCampaign.currentRewardPoolBalance.toFixed(2)}.`);

            const newAction = new Action({
                userId: user._id,
                campaignId: sparkCampaign._id,
                telegramChatId: telegramChatId,
                telegramMessageId: telegramMessageId,
                actionType: 'message',
                rewardAmount: reward,
                currency: 'USD',
                timestamp: new Date(timestamp),
                messageContent: messageContent
            });
            await newAction.save({ session });
            console.log(`[SparkCampaignController] New Action logged for user ${user._id} in campaign ${sparkCampaign._id}. Reward: ${reward}`);

            await session.commitTransaction();
            responseMessage = `Message successfully processed. You earned $${reward.toFixed(2)}!`;
            res.status(200).json({ message: responseMessage });

        } catch (transactionError) {
            await session.abortTransaction();
            console.error("Transaction failed during message tracking:", transactionError);
            throw transactionError;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error("Error in trackMessage (SparkCampaignController):", error);
        next(error);
    }
};

// --- trackReaction ---
exports.trackReaction = async (req, res, next) => {
    const botSecret = req.headers['x-bot-secret'];
    if (botSecret !== SECRET_BOT_API_KEY) {
        console.warn(`Unauthorized attempt to track reaction from IP: ${req.ip}. Secret Mismatch.`);
        return res.status(403).json({ message: "Forbidden: Invalid bot secret for tracking." });
    }

    const {
        telegramChatId,
        telegramMessageId,
        telegramUserId,
        telegramUsername,
        telegramFirstName,
        telegramLastName,
        reactionType,
        reactionEmoji,
        reactionCustomEmojiId,
        timestamp
    } = req.body;

    if (!telegramChatId || !telegramUserId || !reactionType || !timestamp) {
        console.warn('Missing required data for reaction tracking:', req.body);
        return res.status(400).json({ message: "Missing required data for reaction tracking." });
    }

    console.log(`[SparkCampaignController] Received reaction for tracking:`);
    console.log(`     Chat ID: ${telegramChatId}`);
    console.log(`     User ID: ${telegramUserId} (@${telegramUsername || 'N/A'})`);
    console.log(`     Reaction Type: ${reactionType}`);
    console.log(`     Emoji: ${reactionEmoji || reactionCustomEmojiId || 'N/A'}`);
    console.log(`     Timestamp: ${timestamp}`);

    let responseMessage = "Reaction received and processed.";

    try {
        const sparkCampaign = await SparkCampaign.findOne({ telegramChatId: telegramChatId });

        if (!sparkCampaign) {
            console.warn(`[SparkCampaignController] No active Spark Campaign found for Telegram Chat ID: ${telegramChatId}. Skipping reward processing for reaction.`);
            responseMessage = "No active Spark Campaign found for this group.";
            return res.status(200).json({ message: responseMessage });
        }

        console.log(`[SparkCampaignController] Found Spark Campaign: "${sparkCampaign.name}" (ID: ${sparkCampaign._id}) for reaction.`);

        if (sparkCampaign.status !== 'active') {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" is not active (Status: ${sparkCampaign.status}). Skipping reaction reward processing.`);
            responseMessage = `Campaign "${sparkCampaign.name}" is not active.`;
            return res.status(200).json({ message: responseMessage });
        }
        if (sparkCampaign.currentRewardPoolBalance <= 0) {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" has no remaining budget. Skipping reaction reward processing.`);
            responseMessage = `Campaign "${sparkCampaign.name}" budget depleted.`;
            return res.status(200).json({ message: responseMessage });
        }
        if (sparkCampaign.endDate && new Date() > sparkCampaign.endDate) {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" has ended by time. Skipping reaction reward processing.`);
            responseMessage = `Campaign "${sparkCampaign.name}" time has expired.`;
            return res.status(200).json({ message: responseMessage });
        }

        const user = await User.findOne({ telegramUserId: telegramUserId });
        if (!user) {
            console.warn(`[SparkCampaignController] Reaction from unlinked Telegram user ID: ${telegramUserId}. Skipping reward processing.`);
            responseMessage = "Reaction received, but user is not linked to a FOMO account.";
            return res.status(200).json({ message: responseMessage });
        }

        console.log(`[SparkCampaignController] Reaction from linked FOMO user ID: ${user._id} (@${user.username || 'N/A'}).`);

        const lastReactionAction = await Action.findOne({
            userId: user._id,
            campaignId: sparkCampaign._id,
            actionType: 'reaction'
        }).sort({ timestamp: -1 });

        // Assume a default cooldown for reactions if not specified in campaign (e.g., 5 seconds)
        const reactionCooldownSeconds = sparkCampaign.reactionCooldownSeconds || 5;

        if (lastReactionAction) {
            const timeElapsed = (new Date().getTime() - lastReactionAction.timestamp.getTime()) / 1000;
            if (timeElapsed < reactionCooldownSeconds) {
                console.log(`[SparkCampaignController] User ${user._id} is on reaction cooldown for campaign ${sparkCampaign._id}. Time elapsed: ${timeElapsed}s, Required: ${reactionCooldownSeconds}s.`);
                responseMessage = `Reaction received, but user is on cooldown. Please wait ${reactionCooldownSeconds - Math.floor(timeElapsed)} seconds.`;
                return res.status(200).json({ message: responseMessage });
            }
        }


        const reward = REACTION_REWARD_AMOUNT;

        if (sparkCampaign.currentRewardPoolBalance < reward) {
            console.warn(`[SparkCampaignController] Campaign "${sparkCampaign.name}" does not have enough budget for a ${reward} reaction reward. Remaining: ${sparkCampaign.currentRewardPoolBalance}.`);
            responseMessage = `Campaign budget is too low for this reward.`;
            return res.status(200).json({ message: responseMessage });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            user.earnings = (user.earnings || 0) + reward;
            user.pendingEarnings = (user.pendingEarnings || 0) + reward;
            await user.save({ session });
            console.log(`[SparkCampaignController] User ${user._id} earnings updated. Total: ${user.earnings.toFixed(2)}, Pending: ${user.pendingEarnings.toFixed(2)} for reaction.`);

            sparkCampaign.currentRewardPoolBalance -= reward;
            sparkCampaign.totalReactionsTracked = (sparkCampaign.totalReactionsTracked || 0) + 1;
            if (!sparkCampaign.uniqueUsersEngagedIds.includes(user._id)) {
                sparkCampaign.uniqueUsersEngagedIds.push(user._id);
                sparkCampaign.uniqueUsersEngagedCount = sparkCampaign.uniqueUsersEngagedIds.length;
            }
            await sparkCampaign.save({ session });
            console.log(`[SparkCampaignController] Campaign "${sparkCampaign.name}" reward pool updated to ${sparkCampaign.currentRewardPoolBalance.toFixed(2)} for reaction.`);


            const newAction = new Action({
                userId: user._id,
                campaignId: sparkCampaign._id,
                telegramChatId: telegramChatId,
                telegramMessageId: telegramMessageId,
                actionType: 'reaction',
                rewardAmount: reward,
                currency: 'USD',
                timestamp: new Date(timestamp),
                reactionType: reactionType,
                reactionEmoji: reactionEmoji,
                reactionCustomEmojiId: reactionCustomEmojiId
            });
            await newAction.save({ session });
            console.log(`[SparkCampaignController] New Action logged for reaction by user ${user._id} in campaign ${sparkCampaign._id}. Reward: ${reward}`);

            await session.commitTransaction();
            responseMessage = `Reaction successfully processed. You earned $${reward.toFixed(2)}!`;
            res.status(200).json({ message: responseMessage });

        } catch (transactionError) {
            await session.abortTransaction();
            console.error("Transaction failed during reaction tracking:", transactionError);
            throw transactionError;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error("Error in trackReaction (SparkCampaignController):", error);
        next(error);
    }
};

// --- createSparkCampaign ---
exports.createSparkCampaign = async (req, res, next) => {
    console.log('--- createSparkCampaign Controller Execution ---');
    console.log('Raw req.body:', req.body);
    console.log('req.file:', req.file);

    const validationErrors = [];
    let bannerImageUrl = null;
    const creatorId = req.user?.id; // Get creatorId from authenticated user

    // --- 0. Initial validation checks (creatorId, file presence) ---
    if (!creatorId) {
        validationErrors.push('User not authenticated (creatorId is missing).');
    }

    // --- 1. Process and Validate Uploaded File ---
    if (!req.file) {
        validationErrors.push('Banner image file is required.');
    } else {
        try {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({
                    folder: 'spark_campaign_banners',
                    resource_type: 'image'
                }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
                stream.end(req.file.buffer);
            });

            if (!uploadResult || !uploadResult.secure_url) {
                throw new Error('Cloudinary upload failed: No secure URL received.');
            }
            bannerImageUrl = uploadResult.secure_url;
            console.log('Cloudinary Upload Success:', bannerImageUrl);
        } catch (uploadError) {
            console.error("Cloudinary Upload Error:", uploadError);
            validationErrors.push('Failed to upload banner image.');
        }
    }

    // --- 2. Parse Stringified Fields from req.body ---
    let {
        name,
        budget,
        durationHours,
        telegramGroupLink,
        tweetUrl,
        additionalInstructions,
        campaignType
    } = req.body;

    const extractedTelegramChatId = extractTelegramGroupId(telegramGroupLink);
    console.log(`Derived telegramChatId: ${extractedTelegramChatId}`);

    let parsedHashtags = [];
    try {
        parsedHashtags = req.body.hashtags ? JSON.parse(req.body.hashtags) : [];
        if (!Array.isArray(parsedHashtags)) {
            throw new Error("Hashtags data is not a valid array after parsing.");
        }
    } catch (e) {
        console.error('Error parsing hashtags from req.body:', e);
        validationErrors.push('Invalid format for hashtags. Must be a JSON array string.');
        parsedHashtags = []; // Ensure it's an array even on parse failure
    }

    let parsedRequiredActions = {};
    try {
        parsedRequiredActions = req.body.requiredActions ? JSON.parse(req.body.requiredActions) : {};
        if (typeof parsedRequiredActions !== 'object' || parsedRequiredActions === null) {
            throw new Error("Required actions data is not a valid object after parsing.");
        }
    } catch (e) {
        console.error('Error parsing required actions from req.body:', e);
        validationErrors.push('Invalid format for required actions. Must be a JSON object string.');
        parsedRequiredActions = {}; // Ensure it's an object even on parse failure
    }

    const numericBudget = parseFloat(budget);
    const numericDurationHours = parseInt(durationHours, 10);

    // --- 3. Run Server-Side Validation using the helper with PARSED data ---
    const dataForValidation = {
        name,
        budget: numericBudget,
        durationHours: numericDurationHours,
        telegramGroupLink,
        telegramChatId: extractedTelegramChatId,
        tweetUrl,
        hashtags: parsedHashtags,
        requiredActions: parsedRequiredActions,
        additionalInstructions,
        campaignType,
        bannerImageUrl // Include bannerImageUrl for validation
    };

    const inputErrors = validateSparkCampaignInput(dataForValidation);
    validationErrors.push(...inputErrors);

    // If initial validations failed, return early
    if (validationErrors.length > 0) {
        console.error('Final validation errors for createSparkCampaign (before Mongoose schema validation):', validationErrors);
        return res.status(400).json({
            message: 'Validation Failed',
            errors: validationErrors
        });
    }

    // --- Start Transaction ---
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- 4. Fetch Creator and their Project within the transaction ---
        const creator = await User.findById(creatorId).session(session);
        if (!creator) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Creator not found.' });
        }

        // Find the single Project owned by this creator
        const project = await Project.findOne({ ownerId: creatorId }).session(session);
        if (!project) {
            await session.abortTransaction();
            return res.status(404).json({
                message: "Project not found for the creator. A campaign must be linked to an existing project owned by the creator.",
                code: "PROJECT_NOT_FOUND"
            });
        }
        const projectId = project._id; // Get the ID of the found project

        // Calculate required fields (these will also be calculated by pre-save hook, but explicitly setting helps for immediate object state and clarity)
        const effectiveBudget = (typeof numericBudget === 'number' && !isNaN(numericBudget) && numericBudget >= 1) ? numericBudget : 0;
        const userRewardPool = effectiveBudget * 0.80;
        const platformFeeAmount = effectiveBudget * 0.20;
        const currentRewardPoolBalance = userRewardPool; // Initial current balance is the full reward pool

        console.log(`Calculated values before creating SparkCampaign document:`);
        console.log(`     userRewardPool: ${userRewardPool}`);
        console.log(`     platformFeeAmount: ${platformFeeAmount}`);
        console.log(`     currentRewardPoolBalance: ${currentRewardPoolBalance}`);

        // --- 5. Create Spark Campaign Document ---
        const newSparkCampaign = new SparkCampaign({
            creatorId,
            projectId, // Assign the fetched projectId
            name: name.trim(),
            bannerImageUrl: bannerImageUrl,
            budget: numericBudget,
            durationHours: numericDurationHours,
            telegramGroupLink: telegramGroupLink.trim(),
            telegramChatId: extractedTelegramChatId,
            tweetUrl: tweetUrl.trim(),
            hashtags: parsedHashtags,
            requiredActions: parsedRequiredActions,
            additionalInstructions: additionalInstructions ? additionalInstructions.trim() : '',
            campaignType: campaignType || 'spark',
            status: 'pending', // Default status
            userRewardPool,      // Set calculated values
            platformFeeAmount,
            currentRewardPoolBalance
        });

        const savedCampaign = await newSparkCampaign.save({ session });
        console.log(`[SparkCampaignController] New Spark Campaign created: ${savedCampaign.name} (ID: ${savedCampaign._id})`);

        // --- 6. Update User Balance (deduct campaign budget) ---
        if (creator.balance < numericBudget) {
            await session.abortTransaction();
            return res.status(400).json({
                message: `Insufficient balance to create campaign. Required: ${numericBudget}, Available: ${creator.balance}.`,
                code: "INSUFFICIENT_BALANCE"
            });
        }
        creator.balance -= numericBudget;
        await creator.save({ session });
        console.log(`[SparkCampaignController] User ${creatorId} balance updated. New balance: ${creator.balance}`);

        // --- 7. Link Campaign to User's createdSparkCampaigns (if applicable in User model) ---
        // Ensure your User model has a 'createdSparkCampaigns' array field
        await User.findByIdAndUpdate(creatorId, {
            $push: { createdSparkCampaigns: savedCampaign._id }
        }, { new: true, useFindAndModify: false, session });
        console.log(`[SparkCampaignController] Added campaign ${savedCampaign._id} to user ${creatorId}'s created campaigns.`);

        // Commit the transaction
        await session.commitTransaction();

        res.status(201).json({
            message: "Spark Campaign created successfully!",
            campaign: savedCampaign,
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Error creating Spark Campaign (transaction aborted):", error);

        // --- Error Handling ---
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: `Validation Error: ${messages.join(' ')}` });
        }
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Creator ID format provided.' });
        }
        if (error.code === 11000) { // Duplicate key error
            const duplicateKeyField = Object.keys(error.keyValue)[0];
            const duplicateKeyValue = error.keyValue[duplicateKeyField];
            return res.status(409).json({ message: `A campaign with conflicting unique field '${duplicateKeyField}' and value '${duplicateKeyValue}' already exists or is in progress.` });
        }
        // General server error
        next(error); // Pass to general error handler middleware
    } finally {
        session.endSession(); // End the session in all cases
    }
};

// --- getAllSparkCampaigns ---
exports.getAllSparkCampaigns = async (req, res, next) => {
    try {
        const sparkCampaigns = await SparkCampaign.find()
            .populate('creatorId', 'username email')
            .populate('projectId', 'name logo'); // ⭐ Populate projectId to get project name and logo ⭐
        res.status(200).json({
            message: "Spark Campaigns fetched successfully!",
            campaigns: sparkCampaigns
        });
    } catch (error) {
        console.error("Error fetching Spark Campaigns:", error);
        next(error);
    }
};

// --- getSparkCampaignById ---
exports.getSparkCampaignById = async (req, res, next) => {
    try {
        const campaignId = req.params.id;
        const sparkCampaign = await SparkCampaign.findById(campaignId)
            .populate('creatorId', 'username email')
            .populate('projectId', 'name logo'); // ⭐ Populate projectId to get project name and logo ⭐

        if (!sparkCampaign) {
            return res.status(404).json({ message: "Spark Campaign not found." });
        }

        res.status(200).json({
            message: "Spark Campaign fetched successfully!",
            campaign: sparkCampaign
        });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: "Invalid Campaign ID format." });
        }
        console.error("Error fetching Spark Campaign by ID:", error);
        next(error);
    }
};

// --- updateSparkCampaign ---
exports.updateSparkCampaign = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const campaignId = req.params.id;
        const updates = req.body;
        const authenticatedUserId = req.user.id;

        const parsedUpdates = {};
        for (const key in updates) {
            try {
                // Attempt to parse if it's a string, otherwise keep as is
                parsedUpdates[key] = JSON.parse(updates[key]);
            } catch (e) {
                parsedUpdates[key] = updates[key];
            }
        }

        if (parsedUpdates.budget !== undefined) {
            parsedUpdates.budget = parseFloat(parsedUpdates.budget);
        }
        if (parsedUpdates.durationHours !== undefined) {
            parsedUpdates.durationHours = parseInt(parsedUpdates.durationHours, 10);
        }

        if (parsedUpdates.telegramGroupLink !== undefined) {
            parsedUpdates.telegramChatId = extractTelegramGroupId(parsedUpdates.telegramGroupLink);
        }

        // Validate updates using the helper
        const validationErrors = validateSparkCampaignInput(parsedUpdates, true); // true for isUpdate
        if (validationErrors.length > 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: `Validation Error: ${validationErrors.join(' ')}` });
        }

        const sparkCampaign = await SparkCampaign.findById(campaignId).session(session);

        if (!sparkCampaign) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Spark Campaign not found." });
        }
        // Ensure only the creator can update their campaign
        if (sparkCampaign.creatorId.toString() !== authenticatedUserId) {
            await session.abortTransaction();
            return res.status(403).json({ message: "Forbidden: You are not authorized to update this campaign." });
        }

        // Handle banner image update if a new file is provided
        if (req.file) {
            try {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({
                        folder: 'spark_campaign_banners',
                        resource_type: 'image'
                    }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                    stream.end(req.file.buffer);
                });
                if (!uploadResult || !uploadResult.secure_url) {
                    throw new Error('Cloudinary upload failed for banner update.');
                }
                parsedUpdates.bannerImageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary Upload Error during update:", uploadError);
                await session.abortTransaction();
                return res.status(500).json({ message: 'Failed to upload new banner image.' });
            }
        }

        // Logic for budget update: only allowed for 'pending' or 'paused' campaigns
        if (parsedUpdates.budget !== undefined && parsedUpdates.budget !== sparkCampaign.budget) {
            if (['pending', 'paused'].includes(sparkCampaign.status)) {
                // If the budget is being increased, check user balance
                if (parsedUpdates.budget > sparkCampaign.budget) {
                    const creator = await User.findById(authenticatedUserId).session(session);
                    const additionalBudgetNeeded = parsedUpdates.budget - sparkCampaign.budget;
                    if (creator.balance < additionalBudgetNeeded) {
                        await session.abortTransaction();
                        return res.status(400).json({
                            message: `Insufficient balance to increase campaign budget. Needed: ${additionalBudgetNeeded}, Available: ${creator.balance}.`,
                            code: "INSUFFICIENT_BALANCE"
                        });
                    }
                    creator.balance -= additionalBudgetNeeded;
                    await creator.save({ session });
                    console.log(`[SparkCampaignController] User ${authenticatedUserId} balance decreased by ${additionalBudgetNeeded} for budget increase. New balance: ${creator.balance}`);
                }
                // If the budget is being decreased, refund the difference to the user
                else if (parsedUpdates.budget < sparkCampaign.budget) {
                    const creator = await User.findById(authenticatedUserId).session(session);
                    const refundAmount = sparkCampaign.budget - parsedUpdates.budget;
                    creator.balance += refundAmount;
                    await creator.save({ session });
                    console.log(`[SparkCampaignController] User ${authenticatedUserId} balance increased by ${refundAmount} for budget decrease. New balance: ${creator.balance}`);
                }

                sparkCampaign.budget = parsedUpdates.budget;
                // Recalculate related fields if budget changes
                const effectiveBudget = (typeof parsedUpdates.budget === 'number' && !isNaN(parsedUpdates.budget) && parsedUpdates.budget >= 1) ? parsedUpdates.budget : 0;
                sparkCampaign.userRewardPool = effectiveBudget * 0.80;
                sparkCampaign.platformFeeAmount = effectiveBudget * 0.20;
                sparkCampaign.currentRewardPoolBalance = sparkCampaign.userRewardPool; // Reset current pool to new user reward pool (assuming this is desired behavior on budget change)
                console.log(`[SparkCampaignController] Budget updated for campaign ${campaignId}. New budget: ${parsedUpdates.budget}, New Reward Pool: ${sparkCampaign.currentRewardPoolBalance.toFixed(2)}.`);
            } else {
                await session.abortTransaction();
                return res.status(400).json({ message: "Budget can only be modified for pending or paused campaigns." });
            }
        }

        // Apply other allowed updates directly to the sparkCampaign document
        const allowedDirectUpdates = [
            'name',
            'telegramGroupLink',
            'telegramChatId', // This is derived, but can be set if needed
            'tweetUrl',
            'hashtags',
            'requiredActions',
            'additionalInstructions',
            'minMessageLength',
            'messageCooldownSeconds',
            'bannerImageUrl',
            'reactionCooldownSeconds' // Added this field as it's relevant for Spark campaigns
        ];

        for (const key of allowedDirectUpdates) {
            if (parsedUpdates[key] !== undefined) {
                sparkCampaign[key] = parsedUpdates[key];
            }
        }

        // Status change logic
        if (parsedUpdates.status !== undefined && parsedUpdates.status !== sparkCampaign.status) {
            if (parsedUpdates.status === 'active' && sparkCampaign.status === 'pending') {
                // When activating from pending, set start and end dates
                sparkCampaign.startDate = new Date();
                sparkCampaign.endDate = new Date(sparkCampaign.startDate.getTime() + sparkCampaign.durationHours * 60 * 60 * 1000);
            } else if (parsedUpdates.status === 'paused' && sparkCampaign.status === 'active') {
                // No specific date change for pausing, simply changes status
                // You might want to save the remaining duration if you want to resume accurately
            } else if (parsedUpdates.status === 'ended' && sparkCampaign.status === 'active') {
                // When explicitly ending an active campaign, set endDate to now
                sparkCampaign.endDate = new Date();
            } else if (parsedUpdates.status === 'pending' && sparkCampaign.status === 'paused') {
                // If resuming from paused, you might need logic to adjust remaining duration
                // For simplicity, for now, we'll just allow it to go back to pending.
                // Re-activation will set new dates.
            } else if (!['pending', 'active', 'paused', 'ended'].includes(parsedUpdates.status)) {
                await session.abortTransaction();
                return res.status(400).json({ message: "Invalid campaign status provided." });
            }
            sparkCampaign.status = parsedUpdates.status;
        }


        await sparkCampaign.save({ session }); // Save updated campaign within transaction
        console.log(`[SparkCampaignController] Spark Campaign updated: ${sparkCampaign.name} (ID: ${sparkCampaign._id}) by user ${authenticatedUserId}`);

        await session.commitTransaction(); // Commit changes

        res.status(200).json({
            message: "Spark Campaign updated successfully!",
            campaign: sparkCampaign
        });

    } catch (error) {
        await session.abortTransaction(); // Rollback on error
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: "Invalid Campaign ID format." });
        }
        if (error.code === 11000) { // Duplicate key error
            const duplicateKeyField = Object.keys(error.keyValue)[0];
            const duplicateKeyValue = error.keyValue[duplicateKeyField];
            return res.status(409).json({ message: `A campaign with conflicting unique field '${duplicateKeyField}' and value '${duplicateKeyValue}' already exists or is in progress.` });
        }
        console.error("Error updating Spark Campaign:", error);
        next(error); // Pass to general error handler middleware
    } finally {
        session.endSession(); // End the session in all cases
    }
};

exports.getPublicActiveSparkCampaigns = async (req, res, next) => {
    try {
        console.log("Fetching public active Spark Campaigns...");
        const campaigns = await SparkCampaign.find({ status: "active" })
            .populate('creatorId', 'username email')
            .populate('projectId', 'name logo') // ⭐ Populate projectId here too ⭐
            .sort({ createdAt: -1 });

        if (campaigns.length === 0) {
            console.log("No public active Spark Campaigns found.");
            return res.status(200).json([]); // Return empty array with 200 OK
        }

        res.status(200).json(campaigns);
        console.log(`Successfully sent ${campaigns.length} public active Spark Campaigns.`);

    } catch (error) {
        console.error("Error in getPublicActiveSparkCampaigns:", error);
        res.status(500).json({ message: "Server error fetching public active Spark Campaigns.", error: error.message });
    }
};

// --- deleteSparkCampaign ---
exports.deleteSparkCampaign = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const campaignId = req.params.id;
        const authenticatedUserId = req.user.id;

        const sparkCampaign = await SparkCampaign.findById(campaignId).session(session);

        if (!sparkCampaign) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Spark Campaign not found." });
        }
        if (sparkCampaign.creatorId.toString() !== authenticatedUserId) {
            await session.abortTransaction();
            return res.status(403).json({ message: "Forbidden: You are not authorized to delete this campaign." });
        }

        // Refund the remaining currentRewardPoolBalance to the creator
        const creator = await User.findById(authenticatedUserId).session(session);
        if (!creator) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Creator not found for refund." });
        }

        const refundAmount = sparkCampaign.currentRewardPoolBalance;
        creator.balance += refundAmount;
        await creator.save({ session });
        console.log(`[SparkCampaignController] Refunded ${refundAmount.toFixed(2)} to creator ${authenticatedUserId} for deleted campaign ${campaignId}. New balance: ${creator.balance}`);

        // Delete the campaign
        await sparkCampaign.deleteOne({ session });

        // Remove the campaign ID from the user's createdSparkCampaigns array
        await User.findByIdAndUpdate(authenticatedUserId, {
            $pull: { createdSparkCampaigns: campaignId }
        }, { new: true, useFindAndModify: false, session });

        await session.commitTransaction();

        console.log(`[SparkCampaignController] Spark Campaign deleted: ${sparkCampaign.name} (ID: ${sparkCampaign._id}) by user ${authenticatedUserId}`);
        res.status(200).json({ message: "Spark Campaign deleted successfully! Remaining budget refunded to your account." });

    } catch (error) {
        await session.abortTransaction();
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: "Invalid Campaign ID format." });
        }
        console.error("Error deleting Spark Campaign:", error);
        next(error);
    } finally {
        session.endSession();
    }
};

// New function to get user earnings (ensure this is present in your file)
exports.getUserEarnings = async (req, res, next) => {
    try {
        let userIdToQuery;
        const { telegramUserId, campaignId } = req.query;

        // Determine user ID based on authentication (web or bot)
        if (req.user && req.user._id) {
            userIdToQuery = req.user._id;
            console.log(`[UserController] Web user ${userIdToQuery} requesting earnings.`);
        } else if (telegramUserId) {
            // This path should only be taken if x-bot-secret is valid
            const botSecret = req.headers['x-bot-secret']; // Re-check secret for this endpoint as well if accessed by bot
            if (botSecret !== SECRET_BOT_API_KEY) {
                console.warn(`Unauthorized attempt to get user earnings with telegramUserId from IP: ${req.ip}. Secret Mismatch.`);
                return res.status(403).json({ message: "Forbidden: Invalid bot secret for fetching earnings." });
            }

            const user = await User.findOne({ telegramUserId: telegramUserId });
            if (!user) {
                return res.status(404).json({ message: "Telegram user not found or not linked to FOMO." });
            }
            userIdToQuery = user._id;
            console.log(`[UserController] Bot requesting earnings for Telegram user ${telegramUserId} (FOMO ID: ${userIdToQuery}).`);
        } else {
            // This case should ideally be caught by auth middleware for web requests,
            // but good to have a fallback.
            return res.status(400).json({ message: "User ID not provided. Please link your Telegram or ensure authentication." });
        }

        let matchConditions = {
            userId: new mongoose.Types.ObjectId(userIdToQuery)
        };

        if (campaignId) {
            if (!mongoose.Types.ObjectId.isValid(campaignId)) {
                return res.status(400).json({ message: "Invalid campaign ID format." });
            }
            matchConditions.campaignId = new mongoose.Types.ObjectId(campaignId);
        }

        const earningsResult = await Action.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: "$currency",
                    totalEarnings: { $sum: "$rewardAmount" },
                    totalMessages: { $sum: { $cond: [{ $eq: ["$actionType", "message"] }, 1, 0] } },
                    totalReactions: { $sum: { $cond: [{ $eq: ["$actionType", "reaction"] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    currency: "$_id",
                    totalEarnings: { $round: ["$totalEarnings", 2] },
                    totalMessages: 1,
                    totalReactions: 1
                }
            }
        ]);

        if (earningsResult.length === 0) {
            return res.status(200).json({
                message: campaignId ? "No earnings found for this campaign." : "No earnings found for this user.",
                totalEarnings: 0,
                details: []
            });
        }

        const responseData = {
            message: "User earnings retrieved successfully.",
            details: earningsResult,
            totalOverallEarnings: earningsResult.reduce((sum, item) => sum + item.totalEarnings, 0)
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error in getUserEarnings:", error);
        next(error);
    }
};


exports.getSparkCampaignsByCreatorId = async (req, res) => {
    try {
        const creatorId = req.params.creatorId;

        // Optional: Basic validation for creatorId format (e.g., if it's a MongoDB ObjectId)
        if (!mongoose.Types.ObjectId.isValid(creatorId)) {
            return res.status(400).json({ success: false, message: 'Invalid creator ID format.' });
        }

        // Find all Spark Campaigns where creatorId matches the provided ID
        const campaigns = await SparkCampaign.find({ creatorId }).sort({ createdAt: -1 }); // Sort by newest first

        if (!campaigns || campaigns.length === 0) {
            return res.status(404).json({ success: false, message: 'No Spark campaigns found for this creator.' });
        }

        res.status(200).json({ success: true, data: campaigns });

    } catch (error) {
        console.error('Error fetching Spark campaigns by creator ID:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching Spark campaigns.' });
    }
};