
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

    messageContent: {
        type: String,
        trim: true,
        maxlength: 1000 // Limit message length to avoid excessively large documents
    },

}, { timestamps: true }); // Mongoose adds createdAt and updatedAt automatically


ActionSchema.index({ userId: 1, campaignId: 1, timestamp: -1 });

module.exports = mongoose.model('Action', ActionSchema);