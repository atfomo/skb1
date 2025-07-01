
const mongoose = require('mongoose');





const sparkCampaignSchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project', // References the 'Project' model
        required: true, // A Spark Campaign should always belong to a project
        index: true,
    },



    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100,
    },

    bannerImageUrl: {
        type: String,
        required: true, // Assuming a banner is always required
        trim: true,
    },

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



sparkCampaignSchema.pre('save', function(next) {
    
    
    
    
    

    if (this.isNew || this.isModified('budget')) {
        const effectiveBudget = (typeof this.budget === 'number' && !isNaN(this.budget) && this.budget >= 1) ? this.budget : 0;

        this.userRewardPool = effectiveBudget * 0.80;
        this.platformFeeAmount = effectiveBudget * 0.20;

        if (this.isNew) {
            this.currentRewardPoolBalance = this.userRewardPool;
        } else if (this.isModified('budget')) {
            this.currentRewardPoolBalance = this.userRewardPool;
        }

        
        
        
    } else {
        
    }

    
    
    
    
    next();
});

const SparkCampaign = mongoose.model('SparkCampaign', sparkCampaignSchema);




module.exports = SparkCampaign;