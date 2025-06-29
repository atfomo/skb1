// backend/routes/creatorRoutes.js
const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController'); // Import the new controller
const authenticateJWT = require('../middleware/authenticateJWT'); // Import auth middleware

// Route to get all campaigns for the authenticated creator
// This route will be prefixed by /api/creators in your main app.js
router.get('/campaigns', authenticateJWT, creatorController.getCreatorCampaigns);

// Add other creator-specific routes here (e.g., update profile, get earnings, etc.)

module.exports = router;