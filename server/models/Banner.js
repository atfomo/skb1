// backend/models/Banner.js
const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    // imageUrl will now store the full Cloudinary URL
    imageUrl: {
        type: String,
        required: true,
        trim: true
    },
    // NEW FIELD: Store Cloudinary public ID for managing assets
    publicId: {
        type: String,
        trim: true // Not required if you allow banners without images (e.g., placeholder)
    },
    link: {
        type: String, // URL where the banner links to
        required: true,
        trim: true
        // You might add a custom validator here for URL format if needed
    },
    order: { // For controlling the display order of banners
        type: Number,
        default: 0,
        min: 0
    },
    isActive: { // To easily enable/disable banners without deleting
        type: Boolean,
        default: true
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

// Update 'updatedAt' field automatically on save
bannerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;