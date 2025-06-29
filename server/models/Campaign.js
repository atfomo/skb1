// models/Campaign.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- Campaign Task Sub-Schema (for individual tasks within a group) ---
const userIndividualTaskSchema = new Schema({
    link: { type: String, required: true }, // <-- This field will now store the unique ID (e.g., "1750304620264-0")
    targetUrl: { type: String }, // <-- ADD THIS NEW FIELD to store the actual URL (e.g., "google.com")
    
    status: {
        type: String,
        enum: ['not-started', 'verifying', 'pending-review', 'completed', 'rejected'],
        default: 'not-started'
    },
    proofLink: { type: String, default: null }, // URL to the proof (e.g., social media post link for manual-link tasks)
    proofFileUrl: { type: String, default: null },   // <--- Existing field for Cloudinary URL
    proofFileId: { type: String, default: null },    // <--- Existing field for Cloudinary public_id
    submittedAt: { type: Date }, // Timestamp when proof was submitted
    reviewedAt: { type: Date }, // Timestamp when proof was reviewed by creator/admin
    reviewerNotes: { type: String }, // Notes from the reviewer (e.g., reason for rejection)

    payoutAmount: { type: Number, default: 0 } // Stores the specific payout for this single task instance
});

// --- User Participation Schema ---
const userParticipationSchema = new Schema({
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taskGroupKey: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },

    status: {
        type: String,
        enum: ['in-progress', 'pending-review', 'completed', 'rejected', 'partially-completed'],
        default: 'in-progress'
    },

    completedTasks: [userIndividualTaskSchema], // Array of sub-documents

    completedAt: { type: Date }
});

// Add a unique compound index to prevent a user from joining the same task group multiple times in a campaign
userParticipationSchema.index({ campaign: 1, user: 1, taskGroupKey: 1 }, { unique: true });

// --- Campaign Schema (no changes needed here for this specific issue) ---
const campaignSchema = new Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    logo: { type: String },
    image: { type: String },
    imagePublicId: { type: String },
    tags: [{ type: String }],
    rules: [{ type: String }],
    budget: { type: Number, required: true, min: 0 },
    numberOfUsers: { type: Number, required: true, min: 1 },
    estimatedTotalCampaignCost: { type: Number },
    payoutPerUser: { type: Number },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: { type: String, enum: ['active', 'paused', 'completed', 'draft'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uniqueId: { type: String, unique: true },
    completedUsersCount: { type: Number, default: 0, min: 0 },

    socials: {
        twitter: String,
        telegram: String,
        discord: String,
        website: String,
    },

    campaignTasks: [{
        key: { type: String, required: true },
        name: { type: String },
        baseRate: { type: Number },
        instances: { type: Number, default: 1 },
        allocationPercentage: { type: Number },
        targetParticipants: { type: Number, min: 0, default: 0 },
        currentParticipants: { type: Number, min: 0, default: 0 },
        payoutPerInstance: { type: Number },

        links: [{ // Assuming this is your subTasks array from the campaign definition
            _id: { type: String },
            link: { type: String }, // This 'link' here is the one you retrieve from the campaign when populating UserParticipation
            name: { type: String },
            type: {
                type: String,
                enum: ['x-like', 'x-retweet', 'x-comment', 'x-follow', 'discord', 'telegram', 'website', 'manual-upload', 'manual-link'],
            },
            description: { type: String },
            proofRequired: { type: Boolean, default: false },
            proofPlaceholder: { type: String },
            requiredContent: { type: String }
        }],
        guideText: { type: String },
        guideLink: { type: String }
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    completedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});


campaignSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Campaign = mongoose.model('Campaign', campaignSchema);
const UserParticipation = mongoose.model('UserParticipation', userParticipationSchema);

module.exports = { Campaign, UserParticipation };