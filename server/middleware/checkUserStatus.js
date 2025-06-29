// Inside checkUserStatus.js
const User = require('../models/User');

const checkUserStatus = async (req, res, next) => {
    console.log('--- CHECK USER STATUS MIDDLEWARE DEBUG ---');
    console.log('CheckUserStatus: Request Path:', req.path); // This will show "/auth/me"

    if (!req.user || !req.user.id) {
        console.log('CheckUserStatus: req.user or req.user.id not found.');
        return res.status(401).json({ message: 'Authentication required: User ID not available.' });
    }

    try {
        const user = await User.findById(req.user.id);
        req.fullUser = user;

        if (!user) {
            console.log(`CheckUserStatus: User with ID ${req.user.id} not found in DB.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        // *** THIS IS THE MOST IMPORTANT LOG ***
        console.log(`CheckUserStatus: User ID ${user._id}, Username: ${user.username}, Account Status: ${user.accountStatus}`);

        if (user.accountStatus === 'banned') {
            console.warn(`CheckUserStatus: BANNED user ${user._id} attempting to access protected route. Returning 403.`);
            return res.status(403).json({
                message: 'Your account has been permanently banned due to fraudulent activity. All pending earnings have been forfeited. This decision is final.',
                banned: true
            });
        }
        // If you have other statuses like 'pending_review' that should block access, check them here too
        // if (user.accountStatus === 'pending_review') {
        //     console.warn(`CheckUserStatus: User ${user._id} has pending_review status. Returning 403.`);
        //     return res.status(403).json({ message: 'Your account is under review. Access denied.' });
        // }

        console.log('CheckUserStatus: User status is active. Proceeding.');
        next();
    } catch (error) {
        console.error('CheckUserStatus Error:', error.message, error.stack); // Log stack for more info
        res.status(500).json({ message: 'Server error during user status check.' });
    }
};

module.exports = checkUserStatus;