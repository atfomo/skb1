// backend/models/PayoutRequest.js
const mongoose = require('mongoose');

const PayoutRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 50 // Keeping your minimum of 50
    },
    currency: {
        type: String,
        default: 'USD',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending',
        required: true
    },
    paymentMethod: { // ⭐ UPDATED: Enum now only 'crypto' ⭐
        type: String,
        required: true,
        trim: true,
        enum: ['crypto'] // Only 'crypto' is allowed
    },
    paymentDetails: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    adminNotes: {
        type: String,
        trim: true
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    processedAt: {
        type: Date
    }
}, { timestamps: true });

PayoutRequestSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PayoutRequest', PayoutRequestSchema);