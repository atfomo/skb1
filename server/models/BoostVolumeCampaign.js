
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BoostVolumeCampaignSchema = new Schema({

    campaignName: { type: String, required: true, trim: true },
    tokenAddress: { type: String, required: true, trim: true },
    selectedDEX: { type: String, required: true, trim: true },
    speed: { type: String, required: true }, // e.g., 'Normal (3-6 hours)'
    notes: { type: String },


    targetVolume: { type: Number, required: true, min: 100 }, // Total USD volume goal
    volumePerLoop: { type: Number, required: true, min: 20 }, // USD per buy/sell loop
    loopsPerUser: { type: Number, required: true, min: 1, max: 4 }, // Max loops for a single user


    totalCampaignLoops: { type: Number, required: true, min: 0 }, // ceil(targetVolume / volumePerLoop)
    usersNeeded: { type: Number, required: true, min: 0 }, // ceil(totalCampaignLoops / loopsPerUser)
    estimatedTotalCost: { type: Number, required: true, min: 0 }, // Total cost to creator
    estimatedUserPayouts: { type: Number, required: true, min: 0 }, // Total payout to users
    estimatedPlatformProfit: { type: Number, required: true, min: 0 }, // Platform's profit


    currentLoopsCompleted: { type: Number, default: 0, min: 0 }, // Actual verified loops completed
    currentParticipants: { type: Number, default: 0, min: 0 }, // Number of unique users who have associated a wallet
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled', 'draft'],
        default: 'draft'
    },



    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Link to your User model
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date } // Timestamp when campaign status changed to 'completed'
});


BoostVolumeCampaignSchema.pre('save', function(next) {
    this.updatedAt = Date.now();

    if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
        this.completedAt = Date.now();
    }
    next();
});

const BoostVolumeCampaign = mongoose.model('BoostVolumeCampaign', BoostVolumeCampaignSchema);

module.exports = BoostVolumeCampaign;