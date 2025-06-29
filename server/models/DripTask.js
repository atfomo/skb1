// backend/models/Task.js
const mongoose = require('mongoose');

const DripTaskSchema = new mongoose.Schema({
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

    // The 'actionType' for this consolidated task will now be 'combined'
    // This task represents all three actions (like, retweet, comment)
    actionType: {
        type: String,
        enum: ['combined'], // Now it's only 'combined' for these multi-action tasks
        default: 'combined', // Default to 'combined' if not specified
        required: true // Ensure it's explicitly set to 'combined'
    },

    // This is the total earning for completing ALL sub-actions of THIS task
    earningAmount: { type: Number, required: true, default: 0.069 }, // Fixed to 0.069

    // 'participationCount' will now count how many unique users have FULLY completed this combined task
    participationCount: { type: Number, default: 0 },

    // Status of the task (e.g., active, paused, completed)
    status: {
        type: String,
        enum: ['active', 'paused', 'completed'],
        default: 'active'
    },

    createdAt: { type: Date, default: Date.now },

    // CRITICAL CHANGE: 'completedBy' now stores individual user completion status
    // Each entry in this array represents one user's progress on THIS combined task
    completedBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        // Flags to track completion of individual actions by THIS specific user
        isLiked: { type: Boolean, default: false },
        isRetweeted: { type: Boolean, default: false },
        isCommented: { type: Boolean, default: false },
        // A flag to indicate if this user has completed ALL required actions for this task
        isFullyCompleted: { type: Boolean, default: false },
        completedAt: { // Timestamp when THIS user FULLY completed the task
            type: Date,
            default: null // Will be set when isFullyCompleted becomes true
        }
    }],
});

// Update the unique index for combined tasks:
// Ensure only one 'combined' task exists per tweet per campaign.
// This is for the task creation itself, not user completion.
DripTaskSchema.index({ dripCampaign: 1, tweetId: 1, actionType: 1 }, { unique: true });

// Optional: You might not need this partial index if `completedBy.userId` combined with `isFullyCompleted: true` is what you track for earnings.
// If you remove it, make sure your task completion logic correctly handles single completion per user.
// TaskSchema.index({ tweetId: 1, actionType: 1, 'completedBy.userId': 1 }, { unique: true, partialFilterExpression: { 'completedBy.userId': { $exists: true } } });

const DripTask = mongoose.model('DripTask', DripTaskSchema); // <-- Renamed to DripTask
module.exports = DripTask;