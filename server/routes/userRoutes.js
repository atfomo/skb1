// backend/routes/userRoutes.js

const express = require('express');
const router = express.Router();

// --- Log when this file is first loaded ---
console.log('--- userRoutes.js file is loaded! (Bot /earnings fix) ---'); // Updated log message

const authenticateJWT = require('../middleware/authenticateJWT'); // Keep if other routes use it
const checkUserStatus = require('../middleware/checkUserStatus'); // Keep for other routes
const userController = require('../controllers/userController');
const User = require('../models/User'); // Your User model
const PayoutRequest = require('../models/PayoutRequest'); // Your PayoutRequest model

// The /earnings route will now be hit *after* direct app.use('/api/users') authentication.
// It should no longer pass through checkUserStatus here.
router.get('/earnings', (req, res, next) => {
    // THIS IS THE NEW DIAGNOSTIC LOG
    console.log('*** userRoutes: /earnings route handler HIT! ***');
    console.log('*** userRoutes: Current req.path:', req.path);
    console.log('*** userRoutes: Current req.originalUrl:', req.originalUrl);
    // Directly call the controller, as bot secret handles auth at the app.use level
    userController.getUserEarnings(req, res, next); // <--- REMOVED checkUserStatus HERE
});


// --- Route to Save Wallet Address ---
// This route and others still require authenticateJWT and checkUserStatus
router.post('/save-wallet', authenticateJWT, checkUserStatus, async (req, res) => {
    console.log('*** HITTING /api/save-wallet ROUTE HANDLER ***');
    console.log('Request Body for save-wallet:', req.body);

    const { walletAddress } = req.body;
    console.log('req.user from JWT payload (save-wallet):', req.user);
    const userId = req.user?.id;

    if (!userId) {
        console.log('DEBUG (save-wallet): userId (req.user.id) is missing or invalid.');
        return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' });
    }

    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
        console.log('DEBUG (save-wallet): Invalid wallet address provided. Wallet:', walletAddress);
        return res.status(400).json({ message: 'Invalid wallet address provided.' }); // Added a return here for clarity
    }

    try {
        console.log('DEBUG (save-wallet): Attempting to find user with ID:', userId);
        const user = await User.findById(userId);

        if (!user) {
            console.log('DEBUG (save-wallet): User not found in DB for ID:', userId);
            return res.status(404).json({ message: 'User not found.' });
        }
        console.log(`DEBUG (save-wallet): User found: ${user.username}. Updating wallet address.`);

        user.walletAddress = walletAddress ? walletAddress.trim() : '';
        await user.save();
        console.log('DEBUG (save-wallet): Wallet address saved successfully. Response sent.');
        res.status(200).json({ message: 'Wallet address saved successfully!', walletAddress: user.walletAddress });
    } catch (err) {
        console.error('ERROR (save-wallet): Caught exception during wallet saving:', err.message, err.stack);
        res.status(500).json({ message: 'Server error while saving wallet address.' });
    }
});

// --- NEW Route to Save X Account Username ---
router.post('/save-x-account', authenticateJWT, checkUserStatus, async (req, res) => {
    console.log('*** HITTING /api/save-x-account ROUTE HANDLER ***');
    console.log('Request Body for save-x-account:', req.body);

    const { xUsername } = req.body;
    console.log('req.user from JWT payload (save-x-account):', req.user);
    const userId = req.user?.id;

    if (!userId) {
        console.log('DEBUG (save-x-account): userId (req.user.id) is missing or invalid.');
        return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' });
    }

    if (xUsername && typeof xUsername !== 'string') {
        console.log('DEBUG (save-x-account): Invalid xUsername provided. X Username:', xUsername);
        return res.status(400).json({ message: 'Invalid X (Twitter) username provided.' });
    }

    try {
        console.log('DEBUG (save-x-account): Attempting to find user with ID:', userId);
        const user = await User.findById(userId);

        if (!user) {
            console.log('DEBUG (save-x-account): User not found in DB for ID:', userId);
            return res.status(404).json({ message: 'User not found.' });
        }
        console.log(`DEBUG (save-x-account): User found: ${user.username}. Updating X username.`);

        user.xUsername = xUsername ? xUsername.replace(/^@/, '').trim() : '';
        await user.save();
        console.log('DEBUG (save-x-account): X username saved successfully. Response sent.');

        res.status(200).json({ message: 'X account updated successfully!', xUsername: user.xUsername });
    } catch (err) {
        console.error('ERROR (save-x-account): Caught exception during X account saving:', err.message, err.stack);
        res.status(500).json({ message: 'Server error while saving X account.' });
    }
});

// --- Route to Request Payout ---
router.post('/request-payout', authenticateJWT, checkUserStatus, async (req, res) => {
    console.log('*** HITTING /api/request-payout ROUTE HANDLER ***');
    console.log('Request Body for request-payout:', req.body);

    const { amount, paymentMethod, paymentDetails } = req.body;
    console.log('req.user from JWT payload (request-payout):', req.user);
    const userId = req.user?.id;

    if (!userId) {
        console.log('DEBUG (request-payout): userId (req.user.id) is missing from JWT or invalid.');
        return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' });
    }

    try {
        const payoutAmountNum = parseFloat(amount);
        if (isNaN(payoutAmountNum) || payoutAmountNum < 50) {
            console.log('DEBUG (request-payout): Invalid payout amount. Amount:', amount);
            return res.status(400).json({ message: 'Invalid payout amount. Minimum is $50.' });
        }

        if (paymentMethod !== 'crypto') {
            console.log(`DEBUG (request-payout): Invalid payment method. Expected 'crypto', got '${paymentMethod}'.`);
            return res.status(400).json({ message: "Invalid payment method. Only 'crypto' is supported." });
        }
        if (!paymentDetails || typeof paymentDetails !== 'object' || !paymentDetails.address || typeof paymentDetails.address !== 'string' || paymentDetails.address.trim() === '') {
            console.log('DEBUG (request-payout): Missing or invalid crypto address in payment details.');
            return res.status(400).json({ message: 'Crypto wallet address is required in payment details.' });
        }

        console.log('DEBUG (request-payout): Attempting to find user with ID:', userId);
        const user = await User.findById(userId);

        if (!user) {
            console.log('DEBUG (request-payout): User not found in DB for ID:', userId);
            return res.status(404).json({ message: 'User not found.' });
        }

        console.log(`DEBUG (request-payout): User found: ${user.username}. Account status: ${user.accountStatus}`);
        if (user.accountStatus === 'banned') {
            console.log('DEBUG (request-payout): Banned account trying to request payout.');
            return res.status(403).json({ message: 'Banned accounts cannot request payouts.' });
        }

        if (!user.walletAddress || user.walletAddress.trim() === '') {
            console.log('DEBUG (request-payout): User has no wallet address saved in profile. Consider removing this check if paymentDetails.address is sufficient.');
            return res.status(400).json({ message: 'Please ensure your primary wallet address is set in your profile as well.' });
        }

        if (user.pendingEarnings < payoutAmountNum) {
            console.log(`DEBUG (request-payout): Requested amount ($${payoutAmountNum}) exceeds available earnings ($${user.pendingEarnings}).`);
            return res.status(400).json({ message: `Requested amount exceeds your available pending earnings.` });
        }

        console.log('DEBUG (request-payout): Checking for existing pending payout requests.');
        const existingPendingRequest = await PayoutRequest.findOne({
            userId: userId,
            status: 'pending'
        });

        if (existingPendingRequest) {
            console.log('DEBUG (request-payout): Existing pending payout request found.');
            return res.status(400).json({ message: 'You already have a pending payout request. Please wait for it to be processed.' });
        }

        console.log('DEBUG (request-payout): Creating new payout request.');
        const newPayoutRequest = new PayoutRequest({
            userId: userId,
            amount: payoutAmountNum,
            status: 'pending',
            currency: 'USD',
            paymentMethod: 'crypto',
            paymentDetails: paymentDetails
        });

        await newPayoutRequest.save();

        user.pendingEarnings -= payoutAmountNum;
        user.reputationScore = (user.reputationScore || 0) + 10;
        user.totalPayoutsRequested = (user.totalPayoutsRequested || 0) + payoutAmountNum;
        console.log(`DEBUG (request-payout): User ${user.username} reputation score increased to ${user.reputationScore}.`);

        await user.save();
        console.log(`DEBUG (request-payout): Payout request saved, new pending earnings: $${user.pendingEarnings.toFixed(2)}.`);

        res.status(200).json({
            message: 'Payout request submitted successfully!',
            payoutRequest: newPayoutRequest,
            newPendingEarnings: user.pendingEarnings,
            newReputationScore: user.reputationScore
        });

    } catch (error) {
        console.error('ERROR (request-payout): Caught exception during payout request:', error.message, error.stack);
        res.status(500).json({ message: 'Server error. Could not process payout request.' });
    }
});

// --- ADD THESE TWO LINES FOR DEBUGGING (These are good, keep them) ---
console.log('DEBUG userRoutes: Value of userController:', userController);
console.log('DEBUG userRoutes: Type of userController.getUserEarnings:', typeof userController.getUserEarnings);
console.log('DEBUG userRoutes: Is userController.getUserEarnings truthy (exists)?', !!userController.getUserEarnings);
// --- END DEBUGGING LINES ---


// *** CRITICAL CATCH-ALL FOR userRoutes ***
// This will tell us if the request entered userRoutes but didn't match any specific route
router.use((req, res, next) => {
    console.warn(`*** userRoutes: Catch-all triggered for path: ${req.path}, method: ${req.method} ***`);
    console.warn(`*** userRoutes: This means no specific route in userRoutes matched. Original URL: ${req.originalUrl}`);
    // Respond with a 404, or pass it on if you have a global 404 handler.
    // For this diagnostic, explicitly sending 404 here helps confirm it hit this point.
    res.status(404).json({ message: `API endpoint not found within /user for path: ${req.path}` });
});


module.exports = router;