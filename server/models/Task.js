const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    dripCampaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DripCampaign',
        required: true
    },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creatorName: { type: String, required: true },
    creatorLogo: { type: String },

    tweetId: { type: String, required: true },
    tweetLink: { type: String, required: true },

    actionType: {
        type: String,
        enum: ['combined'],
        default: 'combined',
        required: true
    },

    earningAmount: { type: Number, required: true, default: 0.069 },

    participationCount: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['active', 'paused', 'completed'],
        default: 'active'
    },

    createdAt: { type: Date, default: Date.now },

    completedBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isLiked: { type: Boolean, default: false },
        isRetweeted: { type: Boolean, default: false },
        isCommented: { type: Boolean, default: false },
        isFullyCompleted: { type: Boolean, default: false }, // User completed all actions
        isPending: { type: Boolean, default: false }, // <-- ADD THIS LINE
        completedAt: {
            type: Date,
            default: null
        },
        isFraudulent: { type: Boolean, default: false },
        isVerified: { type: Boolean, default: false },
        fraudReason: { type: String, default: null },
    }],
}, { _id: true });

TaskSchema.index({ dripCampaign: 1, tweetId: 1, actionType: 1 }, { unique: true });

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;