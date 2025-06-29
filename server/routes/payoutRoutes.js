// backend/routes/payoutRoutes.js
const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const authenticateJWT = require('../middleware/authenticateJWT'); // ⭐ IMPORTANT: This now brings in authorizeAdmin too ⭐

// Existing route:
router.post('/request', authenticateJWT, payoutController.requestPayout);

// ⭐ NEW: Admin Route to get all Payout Requests ⭐
router.get('/', authenticateJWT, authenticateJWT.authorizeAdmin, payoutController.getAllPayoutRequests);

// ⭐ NEW: Admin Route to update Payout Request Status by ID ⭐
router.put('/:id/status', authenticateJWT, authenticateJWT.authorizeAdmin, payoutController.updatePayoutStatus);

module.exports = router;