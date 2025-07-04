
const express = require('express');
const router = express.Router();
const AdminBoostVolumeController = require('../controllers/AdminBoostVolumeController');
const authenticateJWT = require('../middleware/authenticateJWT'); // Your existing JWT middleware


router.use(authenticateJWT);


router.get('/campaigns', AdminBoostVolumeController.getAllCampaignsForAdmin);


router.get('/campaigns/:campaignId/participations', AdminBoostVolumeController.getParticipationsForCampaign);


router.post('/participations/:participationId/verify-loop', AdminBoostVolumeController.verifyLoop);


router.post('/participations/:participationId/mark-paid', AdminBoostVolumeController.markPaid);


router.post('/participations/:participationId/reject-loop', AdminBoostVolumeController.rejectLoop);

module.exports = router;