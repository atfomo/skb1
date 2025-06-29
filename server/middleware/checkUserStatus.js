// backend/middleware/checkUserStatus.js
const User = require('../models/User'); // Import the User model

const checkUserStatus = async (req, res, next) => {
    // req.user.id is populated by authenticateJWT middleware
    if (!req.user || !req.user.id) {
        // This should ideally not happen if authenticateJWT runs first, but good for robustness
        return res.status(401).json({ message: 'Authentication required to check user status.' });
    }

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.accountStatus === 'banned') {
            console.warn(`User ${user._id} (${user.username}) attempted action but is banned.`);
            return res.status(403).json({
                message: 'Your account has been permanently banned due to fraudulent activity. All pending earnings have been forfeited. This decision is final.',
                banned: true // A flag for the frontend to easily detect and display a specific message
            });
        }

        // Attach the full user object to the request for subsequent handlers if needed
        req.fullUser = user; 
        next(); // User is active, proceed
    } catch (error) {
        console.error('Error in checkUserStatus middleware:', error);
        res.status(500).json({ message: 'Server error during user status check.' });
    }
};

module.exports = checkUserStatus;