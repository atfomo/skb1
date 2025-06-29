// backend/boost_volume/routes/BoostVolumeRoutes.js
const express = require('express');
const router = express.Router();
const BoostVolumeController = require('../controllers/BoostVolumeController'); // Correct casing here
const authenticateJWT = require('../middleware/authenticateJWT');

// BoostVolume Campaign Creation
router.post('/campaigns', authenticateJWT, BoostVolumeController.createCampaign);

// Get a specific BoostVolume campaign by ID (already added, keep this)
router.get('/campaigns/:id', authenticateJWT, BoostVolumeController.getCampaignById);

// User Participation & Task Submission
router.post('/participate', authenticateJWT, BoostVolumeController.participateInCampaign);
router.post('/mark-done', authenticateJWT, BoostVolumeController.markLoopAsDone);

// Campaign Status and Progress Retrieval (can be public or authenticated based on need)
router.get('/campaigns/:campaignId/status', authenticateJWT, BoostVolumeController.getCampaignStatus); // <-- FIX THIS LINE

// GET all active campaigns for users to find tasks
router.get('/active', BoostVolumeController.getAllActiveCampaigns);

// --- NEW ROUTE TO ADD FOR CREATOR DASHBOARD ---
// Get all BoostVolume campaigns created by a specific user (creator)
router.get('/creator/:creatorId', authenticateJWT, BoostVolumeController.getCampaignsByCreatorId);
// Make sure this path aligns with what your frontend CreatorDashboard is calling (e.g., /api/volume-boost-campaigns/creator/:userId)

module.exports = router;