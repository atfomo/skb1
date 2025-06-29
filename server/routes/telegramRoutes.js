// server/routes/telegramRoutes.js
console.log('--- TELEGRAMROUTES.JS IS BEING LOADED --- Timestamp:', new Date().toISOString());
const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegramController');
// REMOVED: const authenticateJWT = require('../middleware/authenticateJWT');
// Authentication for bot routes and general API routes is now handled conditionally
// in the apiRouter.use middleware in server.js.

// Route to initiate Telegram verification from the frontend.
// This route is expected to be called by your frontend, where JWT is typically handled
// by the primary /api middleware, so no 'authenticateJWT' needed here.
router.post('/initiate-verification', telegramController.initiateVerification);

// Route for the Telegram bot to complete the verification.
// This route is authenticated by the 'x-bot-secret' via the apiRouter.use middleware.
router.post('/complete-verification', telegramController.completeVerification);

// NEW ROUTE: For the Telegram bot to link a group to a campaign.
// This route is also authenticated by the 'x-bot-secret' via the apiRouter.use middleware.
router.post('/link-campaign-group', telegramController.linkCampaignGroup);

module.exports = router;