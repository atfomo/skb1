// backend/models/SparkCampaign.js
const mongoose = require('mongoose');

// This console.log should appear IMMEDIATELY when the server loads this model file
console.log('*** SparkCampaign.js file loaded. Defining schema and pre-save hook. ***');
console.log('SparkCampaign.js __dirname:', __dirname);

const sparkCampaignSchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // ⭐ NEW: Project Reference for logo and name ⭐
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project', // References the 'Project' model
        required: true, // A Spark Campaign should always belong to a project
        index: true,
    },
    // ⭐ NOTE: You don't need separate fields for projectName and projectLogo here.
    // You will retrieve them by populating the projectId field when querying.

    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100,
    },
    // --- NEW: Banner Image URL Field ---
    bannerImageUrl: {
        type: String,
        required: true, // Assuming a banner is always required
        trim: true,
    },
    // ------------------------------------
    telegramGroupLink: {
        type: String,
        required: true,
        trim: true,
        match: /^(https?:\/\/)?(www\.)?t\.me\/[a-zA-Z0-9_]+(\/[a-zA-Z0-9_]+)?\/?$/
    },
    telegramChatId: { // Renamed from telegramGroupId for consistency
        type: String,
        unique: true,
        sparse: true,
        index: true // Good for lookup performance
    },
    tweetUrl: {
        type: String,
        required: true,
        trim: true,
        match: /^(https?:\/\/)?(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+(\/)?$/
    },
    hashtags: {
        type: [String],
        default: [],
        validate: {
            validator: function(v) {
                return v.every(tag => tag.startsWith('#') && tag.length > 1);
            },
            message: props => `${props.value} contains invalid hashtags.`
        }
    },
    requiredActions: {
        like: { type: Boolean, default: true },
        retweet: { type: Boolean, default: true },
        comment: { type: Boolean, default: true },
        joinTelegram: { type: Boolean, default: true }
    },
    additionalInstructions: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    budget: {
        type: Number,
        required: true,
        min: 1,
    },
    userRewardPool: {
        type: Number,
        required: true,
        min: 0,
    },
    platformFeeAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    currentRewardPoolBalance: {
        type: Number,
        required: true,
        min: 0,
    },
    durationHours: {
        type: Number,
        required: true,
        min: 1,
        max: 720,
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'paused', 'ended', 'refunded', 'cancelled'],
        default: 'pending',
    },
    campaignType: {
        type: String,
        required: true,
        enum: ['spark'],
        default: 'spark'
    },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    totalMessagesTracked: { type: Number, default: 0 },
    totalClicksTracked: { type: Number, default: 0 },
    totalReactionsTracked: { type: Number, default: 0 },
    uniqueUsersEngagedCount: { type: Number, default: 0 },
    uniqueUsersEngagedIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    minMessageLength: { type: Number, default: 5 },
    messageCooldownSeconds: { type: Number, default: 60 },
}, { timestamps: true });

// Pre-save hook to calculate userRewardPool, platformFeeAmount, and currentRewardPoolBalance
// Explicitly using a traditional function declaration for the callback to ensure 'this' context
sparkCampaignSchema.pre('save', function(next) {
    console.log('--- ENTERING SPARK CAMPAIGN PRE-SAVE HOOK ---');
    console.log('this.isNew:', this.isNew);
    console.log('this.isModified("budget"):', this.isModified('budget'));
    console.log('this.budget (value in hook):', this.budget);
    console.log('typeof this.budget (type in hook):', typeof this.budget);

    if (this.isNew || this.isModified('budget')) {
        const effectiveBudget = (typeof this.budget === 'number' && !isNaN(this.budget) && this.budget >= 1) ? this.budget : 0;

        this.userRewardPool = effectiveBudget * 0.80;
        this.platformFeeAmount = effectiveBudget * 0.20;

        if (this.isNew) {
            this.currentRewardPoolBalance = this.userRewardPool;
        } else if (this.isModified('budget')) {
            this.currentRewardPoolBalance = this.userRewardPool;
        }

        console.log('Calculated userRewardPool:', this.userRewardPool);
        console.log('Calculated platformFeeAmount:', this.platformFeeAmount);
        console.log('Calculated currentRewardPoolBalance:', this.currentRewardPoolBalance);
    } else {
        console.log('Pre-save hook condition (this.isNew || this.isModified("budget")) was FALSE. This should not happen for new documents.');
    }

    console.log('--- EXITING SPARK CAMPAIGN PRE-SAVE HOOK ---');
    console.log('Document state before next() (for required fields):');
    console.log(`userRewardPool: ${this.userRewardPool}, platformFeeAmount: ${this.platformFeeAmount}, currentRewardPoolBalance: ${this.currentRewardPoolBalance}`);
    
    next();
});

const SparkCampaign = mongoose.model('SparkCampaign', sparkCampaignSchema);

console.log('SparkCampaign model definition complete. Exporting model.');
console.log('SparkCampaign.schema.s.hooks.pre.save (at model export):', SparkCampaign.schema.s.hooks.pre.save);

module.exports = SparkCampaign;