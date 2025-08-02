
const mongoose = require('mongoose');

const DripCampaignSchema = new mongoose.Schema({
    creator_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the User model
        required: true,
    },
    package_id: { // e.g., 'ignition', 'boost', 'surge'
        type: String,
        required: true,
    },
    start_time: {
        type: Date,
        required: true,
    },
    end_time: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending_payment', 'active', 'paused', 'completed', 'cancelled'],
        default: 'pending_payment',
    },
    total_budget_usd: {
        type: Number,
        required: true,
    },

    tweet_links: [{
        url: { type: String, required: true },
        addedAt: { type: Date, default: Date.now },

    }],
    total_engagements_target: { // Overall target for the campaign duration
        type: Number,
        default: 0,
    },
    current_engagements_count: { // Overall count for the campaign (total likes + retweets + comments)
        type: Number,
        default: 0,
    },
    engagements_by_type: { // Breakdown of engagements
        likes: { type: Number, default: 0 },
        retweets: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
    },

    unique_participants_count: { // Total count of unique users who fully completed tasks in this campaign
        type: Number,
        default: 0
    },
    completedUserIds: [{ // Array to store User _id's who have fully completed at least one task in this campaign
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],



    userCampaignProgress: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        completedTasks: [{ // Array of Task ObjectIds completed by this user for this campaign
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        }],
        isCampaignFullyCompleted: {
            type: Boolean,
            default: false
        },
        campaignCompletedAt: {
            type: Date,
            default: null
        }
    }],


    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});


DripCampaignSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('DripCampaign', DripCampaignSchema);