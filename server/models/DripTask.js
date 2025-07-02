
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



    actionType: {
        type: String,
        enum: ['combined'], // Now it's only 'combined' for these multi-action tasks
        default: 'combined', // Default to 'combined' if not specified
        required: true // Ensure it's explicitly set to 'combined'
    },


    earningAmount: { type: Number, required: true, default: 0.069 }, // Fixed to 0.069


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
        isFullyCompleted: { type: Boolean, default: false },
        completedAt: { // Timestamp when THIS user FULLY completed the task
            type: Date,
            default: null // Will be set when isFullyCompleted becomes true
        }
    }],
});




DripTaskSchema.index({ dripCampaign: 1, tweetId: 1, actionType: 1 }, { unique: true });





const DripTask = mongoose.model('DripTask', DripTaskSchema); // <-- Renamed to DripTask
module.exports = DripTask;