
const User = require('../models/User');

const checkUserStatus = async (req, res, next) => {

    
    


    if (!req.user || !req.user.id) {
        console.warn('checkUserStatus: User ID missing from req.user after authentication.');
        return res.status(401).json({ message: 'Authentication required to check user status.' });
    }

    try {

        

        const user = await User.findById(req.user.id);

        if (!user) {
            console.warn('checkUserStatus: User not found in DB for ID:', req.user.id);
            return res.status(404).json({ message: 'User not found.' });
        }


        

        if (user.accountStatus === 'banned') {
            console.warn(`User ${user._id} (${user.username}) attempted action but is banned.`);
            return res.status(403).json({
                message: 'Your account has been permanently banned due to fraudulent activity. All pending earnings have been forfeited. This decision is final.',
                banned: true
            });
        }

        req.fullUser = user;
        
        next();

    } catch (error) {
        console.error('ERROR in checkUserStatus middleware:', error.message, error.stack);
        res.status(500).json({ message: 'Server error during user status check.' });
    }
};

module.exports = checkUserStatus;