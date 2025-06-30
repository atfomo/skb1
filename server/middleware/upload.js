// backend/middleware/checkUserStatus.js
const User = require('../models/User'); // Import the User model

const checkUserStatus = async (req, res, next) => {
    // --- NEW DEBUG LOGS FOR CHECKUSERSTATUS ---
    console.log('--- CHECK USER STATUS MIDDLEWARE HIT ---');
    console.log('checkUserStatus: req.user (after authenticateJWT):', req.user);
    // --- END NEW DEBUG LOGS ---

    // req.user.id is populated by authenticateJWT middleware
    if (!req.user || !req.user.id) {
        console.warn('checkUserStatus: User ID missing from req.user after authentication.'); // Added log
        // This should ideally not happen if authenticateJWT runs first, but good for robustness
        return res.status(401).json({ message: 'Authentication required to check user status.' });
    }

    try {
        // --- NEW DEBUG LOGS FOR CHECKUSERSTATUS ---
        console.log('checkUserStatus: Attempting to find user in DB with ID:', req.user.id);
        // --- END NEW DEBUG LOGS ---
        const user = await User.findById(req.user.id);

        if (!user) {
            console.warn('checkUserStatus: User not found in DB for ID:', req.user.id); // Added log
            return res.status(404).json({ message: 'User not found.' });
        }

        // --- NEW DEBUG LOGS FOR CHECKUSERSTATUS ---
        console.log(`checkUserStatus: User found: ${user.username}. Account status: ${user.accountStatus}`);
        // --- END NEW DEBUG LOGS ---
        if (user.accountStatus === 'banned') {
            console.warn(`User ${user._id} (${user.username}) attempted action but is banned.`);
            return res.status(403).json({
                message: 'Your account has been permanently banned due to fraudulent activity. All pending earnings have been forfeited. This decision is final.',
                banned: true // A flag for the frontend to easily detect and display a specific message
            });
        }

        // Attach the full user object to the request for subsequent handlers if needed
        req.fullUser = user;
        console.log('checkUserStatus: User status active. Proceeding to next middleware/route.'); // Added log
        next(); // User is active, proceed
    } catch (error) {
        console.error('ERROR in checkUserStatus middleware:', error.message, error.stack); // Changed to error.message, error.stack for more detail
        res.status(500).json({ message: 'Server error during user status check.' });
    }
};

module.exports = checkUserStatus;