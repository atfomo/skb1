// backend/routes/sparkCampaignRoutes.js
console.log('--- SPARK CAMPAIGN ROUTES FILE LOADED - VERSION: 2025-06-29T22:45:00Z (Bot Auth Fix - Corrected ReferenceError) ---'); // Updated log for clarity and current time
const express = require('express');
const router = express.Router();
const sparkCampaignController = require('../controllers/sparkCampaignController');
const authenticateJWT = require('../middleware/authenticateJWT'); // ⭐ IMPORTANT: THIS LINE MUST BE PRESENT ⭐
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
router.get('/public-active', sparkCampaignController.getPublicActiveSparkCampaigns);

// --- Authenticated Routes (Order from most specific to most general where parameters are involved) ---

// These routes are specifically handled by the `apiRouter.use` middleware in `server.js`
// for bot secret authentication. They should NOT have `authenticateJWT` here directly.
router.post('/track-message', sparkCampaignController.trackMessage); // Correct: Removed authenticateJWT
router.post('/track-reaction', sparkCampaignController.trackReaction); // Correct: Removed authenticateJWT

// All other routes that require JWT authentication will automatically get it
// because the `apiRouter.use` middleware in `server.js` applies `authenticateJWT` by default
// for any path not explicitly listed in `noJwtPaths` or `botSecretOnlyPaths`.

// New route to get Spark Campaigns by Creator ID
router.get('/creator/:creatorId', authenticateJWT, sparkCampaignController.getSparkCampaignsByCreatorId);

// General management routes
router.post('/', authenticateJWT, upload.single('bannerImage'), sparkCampaignController.createSparkCampaign);
router.get('/', authenticateJWT, sparkCampaignController.getAllSparkCampaigns);

// ⭐ IMPORTANT: Place parameterized routes AFTER static routes ⭐
router.put('/:id', authenticateJWT, upload.single('bannerImage'), sparkCampaignController.updateSparkCampaign); // If banner can be updated, keep upload middleware
router.delete('/:id', authenticateJWT, sparkCampaignController.deleteSparkCampaign);
router.get('/:id', authenticateJWT, sparkCampaignController.getSparkCampaignById); // THIS ROUTE MUST BE LAST FOR /:id!

module.exports = router;