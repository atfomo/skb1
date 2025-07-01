
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    walletAddress: {
        type: String,
        default: null,
    },
    xUsername: {
        type: String,
        default: null,
    },

    telegramUserId: {
        type: String, // Telegram user IDs are typically large integers, store as string
        unique: true, // A Telegram ID should be unique across all users on your platform
        sparse: true, // Allows null values, so users without linked Telegram won't violate unique constraint
        default: null,
    },
    telegramUsername: {
        type: String,
        default: null,
    },
    telegramFirstName: {
        type: String,
        default: null,
    },
    telegramLastName: {
        type: String,
        default: null,
    },
    telegramPhotoUrl: {
        type: String,
        default: null,
    },
    earnings: { // Represents total *earned* amount (paid out + pending)
        type: Number,
        default: 0
    },
    pendingEarnings: { // Earnings not yet paid out, crucial for forfeiture
        type: Number,
        default: 0
    },
    totalPayoutsRequested: { // ⭐ NEW: Track sum of all requested payout amounts ⭐
        type: Number,
        default: 0,
        min: 0 // Cannot be negative
    },

    reputationScore: {
        type: Number,
        default: 500,
        min: 0,
        max: 1000
    },
    fraudulentSubmissionsCount: {
        type: Number,
        default: 0
    },
    accountStatus: {
        type: String,
        enum: ['active', 'banned'],
        default: 'active'
    },
    banReason: {
        type: String,
        default: null
    },
    banDate: {
        type: Date,
        default: null
    },
    recentActivities: [{
        task: String,
        project: String,
        date: { type: Date, default: Date.now }
    }],
    role: { // Your existing role field
        type: String,
        default: 'user' // Make sure you set 'admin' for your admin user in DB
    },
    balance: { // For creators to deposit funds to create campaigns
        type: Number,
        default: 0,
        min: 0 // Balance cannot go negative (should be enforced by logic, but schema min helps)
    },
    dateJoined: {
        type: Date,
        default: Date.now
    },

    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project' // Assumes you have a 'Project' model defined elsewhere
    }]
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});


UserSchema.pre('save', async function(next) {
    if (!this.isModified('passwordHash') || !this.passwordHash) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        console.error("Error hashing password during pre-save:", error);
        next(error);
    }
});


UserSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.passwordHash) {
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
