
const express = require('express');
const router = express.Router();
const BoostVolumeController = require('../controllers/BoostVolumeController'); // Correct casing here
const authenticateJWT = require('../middleware/authenticateJWT');


router.post('/campaigns', authenticateJWT, BoostVolumeController.createCampaign);


router.get('/campaigns/:id', authenticateJWT, BoostVolumeController.getCampaignById);


router.post('/participate', authenticateJWT, BoostVolumeController.participateInCampaign);
router.post('/mark-done', authenticateJWT, BoostVolumeController.markLoopAsDone);


router.get('/campaigns/:campaignId/status', authenticateJWT, BoostVolumeController.getCampaignStatus); // <-- FIX THIS LINE


router.get('/active', BoostVolumeController.getAllActiveCampaigns);



router.get('/creator/:creatorId', authenticateJWT, BoostVolumeController.getCampaignsByCreatorId);


module.exports = router;