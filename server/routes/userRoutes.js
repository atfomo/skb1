

const express = require('express');
const router = express.Router();




const authenticateJWT = require('../middleware/authenticateJWT'); // Keep if other routes use it
const checkUserStatus = require('../middleware/checkUserStatus'); // Keep for other routes
const userController = require('../controllers/userController');
const User = require('../models/User'); // Your User model
const PayoutRequest = require('../models/PayoutRequest'); // Your PayoutRequest model



router.get('/earnings', (req, res, next) => {

    
    
    

    userController.getUserEarnings(req, res, next); // <--- REMOVED checkUserStatus HERE
});




router.post('/save-wallet', authenticateJWT, checkUserStatus, async (req, res) => {
    
    

    const { walletAddress } = req.body;
    
    const userId = req.user?.id;

    if (!userId) {
        
        return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' });
    }

    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
        
        return res.status(400).json({ message: 'Invalid wallet address provided.' }); // Added a return here for clarity
    }

    try {
        
        const user = await User.findById(userId);

        if (!user) {
            
            return res.status(404).json({ message: 'User not found.' });
        }
        

        user.walletAddress = walletAddress ? walletAddress.trim() : '';
        await user.save();
        
        res.status(200).json({ message: 'Wallet address saved successfully!', walletAddress: user.walletAddress });
    } catch (err) {
        console.error('ERROR (save-wallet): Caught exception during wallet saving:', err.message, err.stack);
        res.status(500).json({ message: 'Server error while saving wallet address.' });
    }
});


router.post('/save-x-account', authenticateJWT, checkUserStatus, async (req, res) => {
    
    

    const { xUsername } = req.body;
    
    const userId = req.user?.id;

    if (!userId) {
        
        return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' });
    }

    if (xUsername && typeof xUsername !== 'string') {
        
        return res.status(400).json({ message: 'Invalid X (Twitter) username provided.' });
    }

    try {
        
        const user = await User.findById(userId);

        if (!user) {
            
            return res.status(404).json({ message: 'User not found.' });
        }
        

        user.xUsername = xUsername ? xUsername.replace(/^@/, '').trim() : '';
        await user.save();
        

        res.status(200).json({ message: 'X account updated successfully!', xUsername: user.xUsername });
    } catch (err) {
        console.error('ERROR (save-x-account): Caught exception during X account saving:', err.message, err.stack);
        res.status(500).json({ message: 'Server error while saving X account.' });
    }
});


router.post('/request-payout', authenticateJWT, checkUserStatus, async (req, res) => {
    
    

    const { amount, paymentMethod, paymentDetails } = req.body;
    
    const userId = req.user?.id;

    if (!userId) {
        
        return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' });
    }

    try {
        const payoutAmountNum = parseFloat(amount);
        if (isNaN(payoutAmountNum) || payoutAmountNum < 50) {
            
            return res.status(400).json({ message: 'Invalid payout amount. Minimum is $50.' });
        }

        if (paymentMethod !== 'crypto') {
            
            return res.status(400).json({ message: "Invalid payment method. Only 'crypto' is supported." });
        }
        if (!paymentDetails || typeof paymentDetails !== 'object' || !paymentDetails.address || typeof paymentDetails.address !== 'string' || paymentDetails.address.trim() === '') {
            
            return res.status(400).json({ message: 'Crypto wallet address is required in payment details.' });
        }

        
        const user = await User.findById(userId);

        if (!user) {
            
            return res.status(404).json({ message: 'User not found.' });
        }

        
        if (user.accountStatus === 'banned') {
            
            return res.status(403).json({ message: 'Banned accounts cannot request payouts.' });
        }

        if (!user.walletAddress || user.walletAddress.trim() === '') {
            
            return res.status(400).json({ message: 'Please ensure your primary wallet address is set in your profile as well.' });
        }

        if (user.pendingEarnings < payoutAmountNum) {
            
            return res.status(400).json({ message: `Requested amount exceeds your available pending earnings.` });
        }

        
        const existingPendingRequest = await PayoutRequest.findOne({
            userId: userId,
            status: 'pending'
        });

        if (existingPendingRequest) {
            
            return res.status(400).json({ message: 'You already have a pending payout request. Please wait for it to be processed.' });
        }

        
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
        

        await user.save();
        

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










router.use((req, res, next) => {
    console.warn(`*** userRoutes: Catch-all triggered for path: ${req.path}, method: ${req.method} ***`);
    console.warn(`*** userRoutes: This means no specific route in userRoutes matched. Original URL: ${req.originalUrl}`);


    res.status(404).json({ message: `API endpoint not found within /user for path: ${req.path}` });
});


module.exports = router;