
const mongoose = require('mongoose');

const userCampaignParticipationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to your User model
        required: true,
        index: true // Index for efficient lookup by user
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SparkCampaign', // Reference to your SparkCampaign model
        required: true,
        index: true // Index for efficient lookup by campaign
    },

    telegramJoined: { // Indicates if the user has successfully joined the Telegram group
        type: Boolean,
        default: false
    },
    lastTelegramMessageAt: { // Timestamp of the last message sent by this user in this campaign's group
        type: Date,
        default: null
    },
    totalTelegramMessages: { // Count of messages sent by this user in this campaign's group
        type: Number,
        default: 0
    },

    twitterLiked: {
        type: Boolean,
        default: false
    },
    twitterRetweeted: {
        type: Boolean,
        default: false
    },
    twitterCommented: {
        type: Boolean,
        default: false
    },
    lastTwitterActionAt: { // Timestamp of their last Twitter action
        type: Date,
        default: null
    },

    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'disqualified'],
        default: 'pending' // 'pending' means user started participation, but not met all criteria
    },
    earningsAccumulated: { // Earnings from this specific campaign for this user
        type: Number,
        default: 0,
        min: 0
    },
}, { timestamps: true }); // Mongoose adds createdAt and updatedAt automatically


userCampaignParticipationSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

module.exports = mongoose.model('UserCampaignParticipation', userCampaignParticipationSchema);
