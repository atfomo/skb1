const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'campaignModel'
    },
    campaignModel: {
        type: String,
        required: true,
        enum: ['SparkCampaign', 'DripCampaign']
    },
    campaignType: {
        type: String,
        required: true,
        enum: ['spark', 'drip']
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    creatorName: {
        type: String,
        required: true
    },
    campaignName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionHash: {
        type: String,
        required: true
    },
    solanaAddress: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String
    }
}, { timestamps: true });

// Index for efficient queries
PaymentSchema.index({ status: 1, submittedAt: -1 });
PaymentSchema.index({ creatorId: 1 });
PaymentSchema.index({ campaignId: 1 });

module.exports = mongoose.model('Payment', PaymentSchema); 