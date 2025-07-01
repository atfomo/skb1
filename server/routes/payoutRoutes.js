
const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const authenticateJWT = require('../middleware/authenticateJWT'); // ⭐ IMPORTANT: This now brings in authorizeAdmin too ⭐


router.post('/request', authenticateJWT, payoutController.requestPayout);


router.get('/', authenticateJWT, authenticateJWT.authorizeAdmin, payoutController.getAllPayoutRequests);


router.put('/:id/status', authenticateJWT, authenticateJWT.authorizeAdmin, payoutController.updatePayoutStatus);

module.exports = router;