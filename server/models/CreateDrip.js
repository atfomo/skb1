
const mongoose = require('mongoose');

const CreateDripSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the User model
        required: true,
        unique: true // Each user can only have one CreateDrip
    },
    username: { // Project-specific username (e.g., project_handle)
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: { // Display name of the project
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    tags: [String], // Array of strings (e.g., ["DeFi", "NFT", "Gaming"])
    socials: {
        twitter: {
            type: String,
            default: ''
        },
        website: {
            type: String,
            default: ''
        },
        discord: {
            type: String,
            default: ''
        }
    },
    logo: { // Path to the uploaded logo image
        type: String,
        default: ''
    },
    banner: { // Path to the uploaded banner image
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});


CreateDripSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('CreateDrip', CreateDripSchema);