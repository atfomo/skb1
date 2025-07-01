
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to your User model (assuming you have one)
        required: true,
        unique: true // A user can only have one creator dashboard/project profile
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: /^[a-z0-9_.]+$/ // Basic regex for usernames (no spaces/special chars)
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true
    },
    tags: [{ // Array of strings for tags
        type: String,
        trim: true,
        lowercase: true
    }],
    socials: {
        twitter: {
            type: String,
            trim: true,

        },
        website: {
            type: String,
            trim: true,

        },
        discord: {
            type: String,
            trim: true,

        }
    },
    logo: {
        type: String, // Path to the uploaded logo image
        default: '/public/uploads/default-logo.png' // Provide a default if you wish
    },
    banner: {
        type: String, // Path to the uploaded banner image
        default: '/public/uploads/default-banner.png' // Provide a default if you wish
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});


ProjectSchema.pre('save', function(next) {
    if (this.isModified('tags') && typeof this.tags === 'string') {
        this.tags = this.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    next();
});


ProjectSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.tags && typeof update.tags === 'string') {
        update.tags = update.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    this.setUpdate(update);
    next();
});

module.exports = mongoose.model('Project', ProjectSchema);