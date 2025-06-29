// backend/routes/adminBoostVolumeRoutes.js
const express = require('express');
const router = express.Router();
const AdminBoostVolumeController = require('../controllers/AdminBoostVolumeController');
const authenticateJWT = require('../middleware/authenticateJWT'); // Your existing JWT middleware

// All routes here require both JWT authentication and admin role
router.use(authenticateJWT);

// Admin: Get all BoostVolume campaigns
router.get('/campaigns', AdminBoostVolumeController.getAllCampaignsForAdmin);

// Admin: Get all participations for a specific BoostVolume campaign
router.get('/campaigns/:campaignId/participations', AdminBoostVolumeController.getParticipationsForCampaign);

// Admin: Verify a user's submitted loop
router.post('/participations/:participationId/verify-loop', AdminBoostVolumeController.verifyLoop);

// Admin: Mark a user's participation as paid
router.post('/participations/:participationId/mark-paid', AdminBoostVolumeController.markPaid);

// Optional: Admin: Reject a user's submitted loop
router.post('/participations/:participationId/reject-loop', AdminBoostVolumeController.rejectLoop);

module.exports = router;