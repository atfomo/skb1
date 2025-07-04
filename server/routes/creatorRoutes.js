
const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController'); // Import the new controller
const authenticateJWT = require('../middleware/authenticateJWT'); // Import auth middleware



router.get('/campaigns', authenticateJWT, creatorController.getCreatorCampaigns);



module.exports = router;