// backend/models/Action.js
const mongoose = require('mongoose');

const ActionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SparkCampaign', // Assuming this refers to SparkCampaign or a general Campaign model
        required: true
    },
    telegramChatId: {
        type: String,
        required: true,
        trim: true
    },
    telegramMessageId: {
        type: String, // Telegram message ID
        required: true
    },
    actionType: {
        type: String,
        enum: ['message', 'click', 'reaction', 'other'], // Define types of actions
        default: 'message',
        required: true
    },
    rewardAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD', // Or your preferred currency
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    // Add fields relevant to the specific action
    messageContent: {
        type: String,
        trim: true,
        maxlength: 1000 // Limit message length to avoid excessively large documents
    },
    // Could add more fields for anti-fraud (e.g., ipAddress, userAgent)
}, { timestamps: true }); // Mongoose adds createdAt and updatedAt automatically

// Add an index for faster lookup on userId and campaignId for cooldowns
ActionSchema.index({ userId: 1, campaignId: 1, timestamp: -1 });

module.exports = mongoose.model('Action', ActionSchema);