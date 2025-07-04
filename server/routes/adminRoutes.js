
const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authenticateJWT');
const User = require('../models/User'); // Your User model for role checking
const Task = require('../models/Task'); // Your Task model for ban-user-for-fraud


const AdminBoostVolumeController = require('../controllers/AdminBoostVolumeController');


const authorizeRole = (roles) => (req, res, next) => {

    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }

    User.findById(req.user.id) // Fetch full user object from DB to get current role
        .then(user => {
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
            if (!roles.includes(user.role)) { // Assuming 'user.role' exists on your User model
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
            }

            req.fullUser = user;
            next();
        })
        .catch(err => {
            console.error('Error authorizing role:', err);
            res.status(500).json({ message: 'Server error during role authorization.' });
        });
};




router.use(authenticateJWT);
router.use(authorizeRole(['admin']));



router.post('/ban-user-for-fraud', async (req, res) => {
    const { userId, taskId, fraudReason } = req.body;

    if (!userId || !taskId || !fraudReason) {
        return res.status(400).json({ message: 'User ID, Task ID, and fraud reason are required.' });
    }

    try {
        const user = await User.findById(userId);
        const task = await Task.findById(taskId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        const userCompletionEntry = task.completedBy.find(
            entry => String(entry.userId) === String(userId)
        );

        if (!userCompletionEntry) {
            return res.status(404).json({ message: 'User has no record of completing this task.' });
        }

        if (user.accountStatus === 'banned') {
            return res.status(400).json({ message: `User ${user.username} is already banned.` });
        }

        if (userCompletionEntry.isFraudulent) {
            return res.status(400).json({ message: 'This specific submission was already marked fraudulent.' });
        }


        userCompletionEntry.isFraudulent = true;
        userCompletionEntry.isVerified = false; // Mark as not verified if fraudulent
        userCompletionEntry.isFullyCompleted = false; // Ensure it's not considered completed for payout
        userCompletionEntry.fraudReason = fraudReason; // Store the reason on the entry itself
        await task.save();


        user.accountStatus = 'banned';
        user.fraudulentSubmissionsCount += 1;
        user.reputationScore = 0; // Or adjust based on your policy
        user.banReason = fraudReason;
        user.banDate = new Date();


        const forfeitedAmount = user.pendingEarnings;
        user.pendingEarnings = 0;

        await user.save();

        

        res.status(200).json({
            message: `User ${user.username} has been permanently banned and all pending earnings forfeited.`,
            userStatus: user.accountStatus,
            forfeitedAmount: forfeitedAmount
        });

    } catch (error) {
        console.error('Error marking fraudulent submission and banning user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



router.get('/tasks-for-verification', async (req, res) => {
    try {


        const tasks = await Task.find({
            'completedBy': {
                $elemMatch: {
                    isLiked: true,
                    isRetweeted: true,
                    isCommented: true,
                    isFullyCompleted: false,
                    isFraudulent: false, // Ensure it's not already marked fraudulent
                    isVerified: false     // Ensure it's not already verified
                }
            }
        }).select('dripCampaign tweetLink earningAmount completedBy'); // Select all `completedBy` to filter later


        const filteredTasks = tasks.map(task => {
            const pendingEntries = task.completedBy.filter(entry =>
                entry.isLiked && entry.isRetweeted && entry.isCommented &&
                !entry.isFullyCompleted && !entry.isFraudulent && !entry.isVerified
            );
            if (pendingEntries.length > 0) {
                return {
                    _id: task._id,
                    dripCampaign: task.dripCampaign,
                    tweetLink: task.tweetLink,
                    earningAmount: task.earningAmount,
                    completedBy: pendingEntries // Only include the pending entries
                };
            }
            return null;
        }).filter(Boolean); // Remove null entries

        res.status(200).json({ tasks: filteredTasks });
    } catch (error) {
        console.error('Error fetching tasks for verification:', error);
        res.status(500).json({ message: "Server error fetching tasks for verification." });
    }
});



router.post('/:taskId/mark-task-fully-complete', async (req, res) => { 
    try {
        const { taskId } = req.params;
        const { userId } = req.body; // User ID of the person who actually did the task

        if (!userId) {
            return res.status(400).json({ message: "User ID is required in the request body to mark task complete." });
        }


        const updatedTask = await Task.findOneAndUpdate(
            {
                "_id": taskId,
                "completedBy.userId": userId,
                "completedBy.isFullyCompleted": false, // Ensure not already marked fully complete
                "completedBy.isFraudulent": false,    // Ensure not fraudulent
                "completedBy.isVerified": false,      // Ensure not already verified
                "completedBy.isLiked": true,          // All individual actions must be true
                "completedBy.isRetweeted": true,
                "completedBy.isCommented": true
            },
            {
                "$set": {
                    "completedBy.$.isFullyCompleted": true,
                    "completedBy.$.completedAt": new Date(),
                    "completedBy.$.isVerified": true // Mark as verified by admin
                }
            },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedTask) {



            const existingTask = await Task.findById(taskId);
            if (!existingTask) {
                return res.status(404).json({ message: "Task not found." });
            }
            const userCompletionEntry = existingTask.completedBy.find(entry => entry.userId.toString() === userId);
            if (!userCompletionEntry) {
                 return res.status(404).json({ message: "User completion entry not found for this task." });
            }
            if (userCompletionEntry.isFullyCompleted) {
                 return res.status(400).json({ message: "Task already marked as fully completed for this user." });
            }
            if (userCompletionEntry.isFraudulent) {
                 return res.status(400).json({ message: "This task submission was marked as fraudulent and cannot be verified." });
            }
            if (userCompletionEntry.isVerified) {
                 return res.status(400).json({ message: "This task submission was already verified." });
            }
            if (!userCompletionEntry.isLiked || !userCompletionEntry.isRetweeted || !userCompletionEntry.isCommented) {
                 return res.status(400).json({ message: "Individual actions (like, retweet, comment) were not fully completed by the user." });
            }
            return res.status(500).json({ message: "Failed to update task. Unknown issue (possibly already processed)." });
        }


        const user = await User.findById(userId);
        if (user) {

            if (typeof user.pendingEarnings === 'undefined' || user.pendingEarnings === null) {
                user.pendingEarnings = 0;
            }
            user.pendingEarnings += updatedTask.earningAmount;


            if (typeof user.earnings === 'undefined' || user.earnings === null) {
                user.earnings = 0;
            }
            user.earnings += updatedTask.earningAmount;

            await user.save();
            
        } else {
            console.warn(`User with ID ${userId} not found for rewarding earnings after task completion. Task ID: ${taskId}`);
        }

        res.status(200).json({
            message: "Task successfully marked as fully completed and user rewarded.",
            task: updatedTask, // Optionally send back the updated task
            userEarnings: user ? user.pendingEarnings : null // Send back the user's updated pending earnings
        });

    } catch (error) {
        console.error('Error marking task as fully complete:', error);
        res.status(500).json({ message: 'Server error marking task complete.' });
    }
});


router.get('/tasks-for-verification', async (req, res) => {
    try {
        const tasks = await Task.aggregate([
            {


                $match: {
                    'completedBy': {
                        $elemMatch: {
                            isLiked: true,
                            isRetweeted: true,
                            isCommented: true,
                            isFullyCompleted: false,
                            isFraudulent: false,
                            isVerified: false
                        }
                    }
                }
            },
            {



                $project: {
                    _id: 1,
                    dripCampaign: 1,
                    tweetLink: 1,
                    earningAmount: 1,
                    completedBy: {
                        $filter: {
                            input: '$completedBy',
                            as: 'entry',
                            cond: {
                                $and: [
                                    { '$$entry.isLiked': true },
                                    { '$$entry.isRetweeted': true },
                                    { '$$entry.isCommented': true },
                                    { '$$entry.isFullyCompleted': false },
                                    { '$$entry.isFraudulent': false },
                                    { '$$entry.isVerified': false }
                                ]
                            }
                        }
                    }
                }
            },
            {





                $match: {
                    'completedBy.0': { $exists: true } // Check if the filtered array has at least one element
                }
            }
        ]);

        res.status(200).json({ tasks: tasks });
    } catch (error) {
        console.error('Error fetching tasks for verification:', error);
        res.status(500).json({ message: "Server error fetching tasks for verification." });
    }
});




router.get('/boost-volume/campaigns', AdminBoostVolumeController.getAllCampaignsForAdmin);
router.get('/boost-volume/campaigns/:campaignId/participations', AdminBoostVolumeController.getParticipationsForCampaign);
router.post('/boost-volume/participations/:participationId/verify-loop', AdminBoostVolumeController.verifyLoop);
router.post('/boost-volume/participations/:participationId/mark-paid', AdminBoostVolumeController.markPaid);
router.post('/boost-volume/participations/:participationId/reject-loop', AdminBoostVolumeController.rejectLoop); // NEW rejection endpoint



module.exports = router;