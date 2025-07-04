
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const verifiedLoopSchema = new Schema({
    signature: { type: String, required: true }, // Transaction signature of the completed loop
    verifiedAt: { type: Date, default: Date.now }, // When this loop was verified
    rewardAmount: { type: Number, required: true, min: 0 }, // The reward amount for this specific verified loop

}, { _id: false }); // Do not create _id for subdocuments if not strictly needed

const rejectedLoopSchema = new Schema({
    rejectedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true, trim: true },


}, { _id: false });

const BoostVolumeParticipationSchema = new Schema({
    campaign: { type: Schema.Types.ObjectId, ref: 'BoostVolumeCampaign', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Link to your User model
    walletAddress: { type: String, required: true, trim: true }, // User's wallet address for this participation

    verifiedLoops: [verifiedLoopSchema], // Array of successfully verified loops

    pendingLoops: { // Count of loops submitted by user but not yet verified/rejected by admin
        type: Number,
        default: 0,
        min: 0
    },

    totalEarned: { // Total USD earned from all *verified* loops within this participation
        type: Number,
        default: 0,
        min: 0
    },

    status: {
        type: String,
        enum: ['active', 'completed_by_user', 'suspended', 'cancelled', 'awaiting_payout', 'paid'],
        default: 'active'
    },
    joinedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }, // Timestamp when this user reached their max verified loops for this campaign
    
    payoutTxId: { type: String, trim: true }, // NEW: Transaction ID for the payout (if one single payout for totalEarned)
    paidAt: { type: Date }, // NEW: When the payout was actually made

    rejectedLoops: [rejectedLoopSchema] // NEW: Array to store details of rejected loops (for audit/feedback)

}, { timestamps: true }); // Mongoose `timestamps` option automatically adds `createdAt` and `updatedAt`

BoostVolumeParticipationSchema.index({ campaign: 1, user: 1 }, { unique: true });
BoostVolumeParticipationSchema.index({ status: 1 }); // Useful for querying by status



BoostVolumeParticipationSchema.pre('save', function(next) {
    if (this.isModified('verifiedLoops')) {
        this.totalEarned = this.verifiedLoops.reduce((sum, loop) => sum + loop.rewardAmount, 0);
    }







    

    next();
});

const BoostVolumeParticipation = mongoose.model('BoostVolumeParticipation', BoostVolumeParticipationSchema);

module.exports = BoostVolumeParticipation;