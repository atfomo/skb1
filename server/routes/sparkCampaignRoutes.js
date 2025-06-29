// backend/routes/sparkCampaignRoutes.js
console.log('--- SPARK CAMPAIGN ROUTES FILE LOADED - VERSION: 2025-06-27T10:43:37Z (FINAL w/ Multer + Creator Campaigns) ---'); // Updated log for clarity and current time
const express = require('express');
const router = express.Router();
const sparkCampaignController = require('../controllers/sparkCampaignController');
const authenticateJWT = require('../middleware/authenticateJWT'); // IMPORTANT: Uncomment this line!
const telegramController = require('../controllers/telegramController'); // Unused in this file, consider removing if not needed elsewhere

// --- Multer and Cloudinary Setup for File Uploads ---
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (ensure these are in your .env file)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for in-memory storage. This is ideal when directly uploading to Cloudinary
// as it avoids saving the file to your local disk first.
const storage = multer.memoryStorage(); // Stores the file in req.file.buffer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB (adjust as needed)
    fileFilter: (req, file, cb) => {
        // Basic file type validation
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});
// --- END Multer and Cloudinary Setup ---


// --- Public Route (Define specific static paths first!) ---
// Replace the temporary test response with the actual controller method
router.get('/public-active', sparkCampaignController.getPublicActiveSparkCampaigns);

// --- Authenticated Routes (Order from most specific to most general where parameters are involved) ---

// Example of a specific route that needs auth, but placed after public-active
// Ensure these routes are protected if only logged-in users track actions
router.post('/track-message', authenticateJWT, sparkCampaignController.trackMessage); // Added authenticateJWT
router.post('/track-reaction', authenticateJWT, sparkCampaignController.trackReaction); // Added authenticateJWT

// New route to get Spark Campaigns by Creator ID
// It's good to place static-segment routes like '/creator/:id' before general '/:id' routes
router.get('/creator/:creatorId', authenticateJWT, sparkCampaignController.getSparkCampaignsByCreatorId); // <--- ADDED THIS ROUTE!

// General management routes
// Apply `upload.single('bannerImage')` middleware here for the create route.
// 'bannerImage' should match the name attribute of the file input in your frontend FormData.
router.post('/', authenticateJWT, upload.single('bannerImage'), sparkCampaignController.createSparkCampaign);
router.get('/', authenticateJWT, sparkCampaignController.getAllSparkCampaigns);

// ⭐ IMPORTANT: Place parameterized routes AFTER static routes ⭐
// If banner can be updated, add upload.single('bannerImage') here too
router.put('/:id', authenticateJWT, upload.single('bannerImage'), sparkCampaignController.updateSparkCampaign); // <--- Potentially add upload middleware here if banner can be updated
router.delete('/:id', authenticateJWT, sparkCampaignController.deleteSparkCampaign);
router.get('/:id', authenticateJWT, sparkCampaignController.getSparkCampaignById); // THIS ROUTE MUST BE LAST FOR /:id!

module.exports = router;