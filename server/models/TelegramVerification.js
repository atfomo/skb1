
const mongoose = require('mongoose');

const telegramVerificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to your User model
        required: true,
        unique: true, // Only one pending verification per user at a time
    },
    verificationCode: {
        type: String,
        required: true,
        unique: true, // Ensure codes are unique
    },
    telegramUsername: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    expiresAt: {
        type: Date,
        required: true,


        index: { expires: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('TelegramVerification', telegramVerificationSchema);