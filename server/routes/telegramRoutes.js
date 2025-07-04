

const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegramController');







router.post('/initiate-verification', telegramController.initiateVerification);



router.post('/complete-verification', telegramController.completeVerification);



router.post('/link-campaign-group', telegramController.linkCampaignGroup);

module.exports = router;