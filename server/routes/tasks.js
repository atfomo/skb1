const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authenticateJWT'); // Renamed authenticateJWT for clarity if 'authorize' is preferred
const checkUserStatus = require('../middleware/checkUserStatus'); // Your new status check middleware
const { Task, User, DripCampaign } = require('../services/db'); // Assuming db.js exports these models
const mongoose = require('mongoose');


router.get('/available', authorize, async (req, res) => {
    const userId = req.user ? req.user.id : null;
    const userIdObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    console.log(`[GET /available] Request received. Logged-in userId: ${userId}`);

    try {
        const availableTasks = await Task.find({
            status: 'active',
        })
        .populate('dripCampaign', 'package_id status end_time unique_participants_count userCampaignProgress tweet_links')
        .populate('creatorId', 'username profilePictureUrl')
        .sort({ createdAt: -1 })
        .lean(); // Keep .lean() here. It's generally good practice.

        let filteredTasks = availableTasks.filter(task => {
            if (!task.dripCampaign) {
                console.warn(`[GET /available] Task ${task._id} has no associated DripCampaign or it failed to populate. Skipping.`);
                return false;
            }

            const campaignEnded = new Date() > task.dripCampaign.end_time;
            const campaignActive = task.dripCampaign.status === 'active';

            return campaignActive && !campaignEnded;
        });

        console.log(`[GET /available] Found ${filteredTasks.length} active and non-ended tasks after initial filter.`);


        const tasksWithUserProgress = filteredTasks.map(task => {
            if (!task.dripCampaign) {
                console.error(`[GET /available] Unexpected null/undefined dripCampaign for task ${task._id} in map. Returning null.`);
                return null;
            }

            let userCompletionEntry = null;
            let userCampaignEntry = null;

            if (userIdObjectId) { // Only attempt to find if a user is logged in
                if (task.completedBy && task.completedBy.length > 0) {
                    userCompletionEntry = task.completedBy.find(entry => entry.userId.equals(userIdObjectId));
                    if (userCompletionEntry) {
                        // console.log(`[GET /available] For Task ID: ${task._id}, found userCompletionEntry:`, JSON.stringify(userCompletionEntry));
                    } else {
                        // console.log(`[GET /available] For Task ID: ${task._id}, userCompletionEntry NOT found for userId: ${userId}`);
                    }
                } else {
                    // console.log(`[GET /available] For Task ID: ${task._id}, 'completedBy' array is empty or undefined.`);
                }
                userCampaignEntry = task.dripCampaign.userCampaignProgress?.find(entry => entry.userId.equals(userIdObjectId));
            } else {
                console.log(`[GET /available] No userId provided, skipping user-specific progress lookup for task ${task._id}.`);
            }

            return {
                _id: task._id,
                creatorId: task.creatorId._id,
                creatorName: task.creatorId.username,
                creatorLogo: task.creatorId.profilePictureUrl,
                tweetId: task.tweetId,
                tweetLink: task.tweetLink,
                actionType: task.actionType,
                earningAmount: task.earningAmount,
                participationUsers: task.participationCount,
                status: task.status,
                createdAt: task.createdAt,
                likeLink: `https://x.com/intent/like?tweet_id=${task.tweetId}`,
                retweetLink: `https://x.com/intent/retweet?tweet_id=${task.tweetId}`,
                commentLink: `https://x.com/intent/tweet?in_reply_to=${task.tweetId}`,

                // These flags are now correctly populated from the database
                isFullyCompletedByUser: userCompletionEntry ? userCompletionEntry.isFullyCompleted : false,
                isPendingByUser: userCompletionEntry ? userCompletionEntry.isPending : false,
                isVerifiedByUser: userCompletionEntry ? userCompletionEntry.isVerified : false,
                userActionProgress: userCompletionEntry ? {
                    isLiked: userCompletionEntry.isLiked,
                    isRetweeted: userCompletionEntry.isRetweeted,
                    isCommented: userCompletionEntry.isCommented,
                } : { isLiked: false, isRetweeted: false, isCommented: false },
                isCampaignFullyCompletedByUser: userCampaignEntry ? userCampaignEntry.isCampaignFullyCompleted : false,
                campaignTweetCount: task.dripCampaign.tweet_links.length || 0
            };
        }).filter(Boolean); // Filter out any null entries

        console.log(`[GET /available] Sending ${tasksWithUserProgress.length} tasks to frontend.`);
        if (tasksWithUserProgress.length > 0) {
            console.log(`Example of first task's user progress:`, JSON.stringify(tasksWithUserProgress[0]?.userActionProgress));
            console.log(`Example of first task's pending/verified status: isPendingByUser: ${tasksWithUserProgress[0]?.isPendingByUser}, isVerifiedByUser: ${tasksWithUserProgress[0]?.isVerifiedByUser}`);
        }

        res.status(200).json(tasksWithUserProgress);

    } catch (error) {
        console.error("[GET /available] Server error fetching available tasks:", error);
        res.status(500).json({ message: 'Server error fetching tasks.' });
    }
});

router.post('/:taskId/mark-action-complete', authorize, checkUserStatus, async (req, res) => {
    const { taskId } = req.params;
    const { actionType } = req.body;
    const userId = req.user.id;
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    if (!['like', 'retweet', 'comment'].includes(actionType)) {
        console.warn(`[POST /mark-action-complete] Invalid action type received: ${actionType}`);
        return res.status(400).json({ message: 'Invalid action type provided.' });
    }

    let actionFieldName;
    switch (actionType) {
        case 'like':
            actionFieldName = 'isLiked';
            break;
        case 'retweet':
            actionFieldName = 'isRetweeted';
            break;
        case 'comment':
            actionFieldName = 'isCommented';
            break;
        default:
            console.error(`[POST /mark-action-complete] Unexpected action type: ${actionType}`);
            return res.status(400).json({ message: 'Invalid action type provided.' });
    }

    try {
        let updatedTask = await Task.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(taskId),
                status: 'active',
                'completedBy': {
                    $elemMatch: {
                        userId: userIdObjectId,
                        [actionFieldName]: false // This is the crucial condition
                    }
                }
            },
            {
                $set: {
                    [`completedBy.$.${actionFieldName}`]: true
                }
            },
            {
                new: true,
                runValidators: true,
                select: 'completedBy dripCampaign earningAmount'
            }
        );

        let responseMessage = '';
        let userCompletionEntryAfterUpdate = null;

        if (!updatedTask) {
            const existingTask = await Task.findById(taskId).select('completedBy status dripCampaign earningAmount');

            if (!existingTask || existingTask.status !== 'active') {
                console.warn(`[POST /mark-action-complete] Task ${taskId} not found or not active after findOneAndUpdate failure.`);
                return res.status(404).json({ message: 'Task not found or not active.' });
            }

            const existingUserCompletionEntry = existingTask.completedBy.find(entry => entry.userId.equals(userIdObjectId));

            if (existingUserCompletionEntry) {
                if (existingUserCompletionEntry[actionFieldName]) {
                    responseMessage = `Action '${actionType}' for task was already completed by user.`;
                    userCompletionEntryAfterUpdate = existingUserCompletionEntry;
                    updatedTask = existingTask; // crucial: assign existingTask to updatedTask if already true
                } else {
                    console.error(`[POST /mark-action-complete] CRITICAL: Existing user entry found, action ${actionType} is FALSE, but findOneAndUpdate returned NULL.`);
                    console.error(`[POST /mark-action-complete] Debug details:`);
                    console.error(`   Requested taskId: ${taskId}`);
                    console.error(`   Requested actionType: ${actionType}`);
                    console.error(`   Derived actionFieldName: ${actionFieldName}`);
                    console.error(`   userId from auth: ${userId}`);
                    console.error(`   userIdObjectId (converted): ${userIdObjectId.toString()}`);
                    console.error(`   Existing Task ID: ${existingTask._id.toString()}`);
                    console.error(`   Existing Task Status: ${existingTask.status}`);
                    const debugEntry = existingTask.completedBy.find(entry => entry.userId.equals(userIdObjectId));
                    if (debugEntry) {
                        console.error(`   Specific 'completedBy' entry for user: ${JSON.stringify(debugEntry)}`);
                        console.error(`   Value of ${actionFieldName} in existing entry: ${debugEntry[actionFieldName]}`);
                    } else {
                        console.error(`   User's 'completedBy' entry was NOT found in the 'existingTask' fetched immediately after findOneAndUpdate failed.`);
                    }
                    return res.status(500).json({ message: 'Internal server error: Failed to update existing action. Please contact support.' });
                }
            } else {
                const newCompletionEntry = {
                    userId: userIdObjectId,
                    isLiked: actionType === 'like',
                    isRetweeted: actionType === 'retweet',
                    isCommented: actionType === 'comment',
                    isFullyCompleted: false,
                    isPending: false, // Default to false when adding a new entry
                    isVerified: false, // Default to false when adding a new entry
                    completedAt: null
                };

                const pushResult = await Task.findOneAndUpdate(
                    { _id: new mongoose.Types.ObjectId(taskId), status: 'active' },
                    { $push: { completedBy: newCompletionEntry } },
                    { new: true, runValidators: true, select: 'completedBy dripCampaign earningAmount' }
                );

                if (pushResult) {
                    updatedTask = pushResult; // crucial: assign pushResult to updatedTask
                    responseMessage = `${actionType} action recorded successfully.`;
                } else {
                    console.error(`[POST /mark-action-complete] Failed to push new completion entry for task ${taskId}, user ${userId}. Task not found or not active.`);
                    return res.status(500).json({ message: 'Internal server error: Failed to record action.' });
                }
            }
        } else {
            responseMessage = `${actionType} action recorded successfully.`;
        }

        userCompletionEntryAfterUpdate = updatedTask ?
            updatedTask.completedBy.find(entry => entry.userId.equals(userIdObjectId)) :
            userCompletionEntryAfterUpdate;

        if (!userCompletionEntryAfterUpdate) {
            console.error(`[POST /mark-action-complete] CRITICAL: No user completion entry found AFTER all update/push operations for task ${taskId}, user ${userId}.`);
            return res.status(500).json({ message: 'Internal server error: User completion entry missing after operation.' });
        }

        const allActionsForTask = ['isLiked', 'isRetweeted', 'isCommented'];
        const allIndividualActionsCompleted = allActionsForTask.every(action => userCompletionEntryAfterUpdate[action]);

        if (updatedTask && updatedTask.dripCampaign) {
            const campaign = await DripCampaign.findById(updatedTask.dripCampaign);
            if (campaign) {
                campaign.engagements_by_type[actionType] = (campaign.engagements_by_type[actionType] || 0) + 1;
                campaign.current_engagements_count = (campaign.current_engagements_count || 0) + 1;
                campaign.markModified('engagements_by_type');
                await campaign.save();
            } else {
                console.warn(`[POST /mark-action-complete] Campaign for task ${taskId} (ID: ${updatedTask.dripCampaign}) not found. Engagement count not updated.`);
            }
        } else {
            console.warn(`[POST /mark-action-complete] updatedTask or updatedTask.dripCampaign is null/undefined. Campaign metrics not updated.`);
        }

        res.status(200).json({
            message: responseMessage,
            allIndividualActionsCompleted: allIndividualActionsCompleted,
            userCompletionProgress: userCompletionEntryAfterUpdate // Ensure this includes isPending and isVerified
        });

    } catch (error) {
        console.error(`[POST /mark-action-complete] CRITICAL ERROR marking action '${actionType}' as completed for task ${taskId}:`, error);
        res.status(500).json({ message: `Server error marking action '${actionType}' as completed.` });
    }
});

router.post('/:taskId/mark-task-fully-complete', authorize, checkUserStatus, async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.id; // From authorize middleware
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    try {
        const task = await Task.findById(taskId);
        if (!task || task.status !== 'active') {
            console.warn(`[POST /mark-task-fully-complete] Task ${taskId} not found or not active.`);
            return res.status(404).json({ message: 'Task not found or not active.' });
        }

        let userCompletionEntry = task.completedBy.find(entry => entry.userId.equals(userIdObjectId));

        if (!userCompletionEntry) {
            console.warn(`[POST /mark-task-fully-complete] User ${userId} has no completion entry for task ${taskId}.`);
            return res.status(400).json({ message: 'No completion entry found for this user and task. Please complete individual actions first.' });
        }

        const allIndividualActionsCompleted = userCompletionEntry.isLiked &&
                                               userCompletionEntry.isRetweeted &&
                                               userCompletionEntry.isCommented;

        if (!allIndividualActionsCompleted) {
            console.warn(`[POST /mark-task-fully-complete] User ${userId} has not completed all individual actions for task ${taskId} yet.`);
            return res.status(400).json({ message: 'Please complete all individual actions (like, retweet, comment) before marking as DONE.' });
        }

        // Check if already pending or verified (meaning it's already been submitted)
        if (userCompletionEntry.isPending || userCompletionEntry.isVerified) {
            console.log(`[POST /mark-task-fully-complete] Task ${taskId} already submitted (pending or verified) by user ${userId}.`);
            return res.status(200).json({
                message: 'Task already submitted for verification by you.',
                taskId: taskId,
                userCompletionProgress: userCompletionEntry
            });
        }

        // --- CRITICAL CHANGE HERE ---
        // When user marks as DONE, it becomes PENDING, not fully completed yet.
        const updatedTask = await Task.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(taskId), 'completedBy.userId': userIdObjectId },
            {
                $set: {
                    'completedBy.$.isFullyCompleted': false, // Set to FALSE here. Only admin verification sets it to TRUE.
                    'completedBy.$.isPending': true,         // Set to TRUE here. User has submitted for review.
                    'completedBy.$.completedAt': new Date()
                },
                $inc: { participationCount: 1 } // Increment task's participationCount for this specific task
            },
            { new: true, runValidators: true }
        );

        if (!updatedTask) {
             console.error(`[POST /mark-task-fully-complete] FAILED to update flags for task ${taskId} by user ${userId}.`);
             return res.status(500).json({ message: 'Internal server error: Failed to update task completion status.' });
        }
        userCompletionEntry = updatedTask.completedBy.find(entry => entry.userId.equals(userIdObjectId)); // Get the updated entry

        const campaign = await DripCampaign.findById(task.dripCampaign); // Use original task to get campaign ID
        if (campaign) {
            const userProgressIndexInCampaign = campaign.userCampaignProgress.findIndex(p => p.userId.equals(userIdObjectId));

            let campaignUpdateQuery = {}; // Object to build campaign update

            if (userProgressIndexInCampaign === -1) {
                campaignUpdateQuery.$push = {
                    userCampaignProgress: {
                        userId: userIdObjectId,
                        completedTasks: [new mongoose.Types.ObjectId(taskId)], // Use ObjectId
                        isCampaignFullyCompleted: false, // Default to false
                        campaignCompletedAt: null
                    }
                };
                campaignUpdateQuery.$inc = { unique_participants_count: 1 }; // Increment unique participant count for campaign
                campaignUpdateQuery.$addToSet = { completedUserIds: userIdObjectId }; // Add user to unique completed user IDs for this campaign
            } else {
                await DripCampaign.updateOne(
                    { _id: campaign._id, "userCampaignProgress.userId": userIdObjectId },
                    {
                        $addToSet: {
                            "userCampaignProgress.$.completedTasks": new mongoose.Types.ObjectId(taskId) // Use ObjectId
                        }
                    }
                );
            }

            if (Object.keys(campaignUpdateQuery).length > 0) {
                 await DripCampaign.updateOne(
                    { _id: campaign._id },
                    campaignUpdateQuery
                );
            }

            const updatedCampaign = await DripCampaign.findById(campaign._id); // Re-fetch to get latest state
            const currentUserCampaignProgress = updatedCampaign.userCampaignProgress.find(p => p.userId.equals(userIdObjectId));

            if (currentUserCampaignProgress) {
                const allCampaignTasks = await Task.find({
                    dripCampaign: updatedCampaign._id,
                    status: 'active'
                }).select('_id'); // Only need IDs

                const allCampaignTaskIds = allCampaignTasks.map(t => t._id.toString());
                const completedTaskIdsByUser = currentUserCampaignProgress.completedTasks.map(id => id.toString());

                const hasCompletedAllCurrentCampaignTasks = allCampaignTaskIds.length > 0 &&
                                                             allCampaignTaskIds.every(campaignTaskId =>
                                                                 completedTaskIdsByUser.includes(campaignTaskId)
                                                             );

                if (hasCompletedAllCurrentCampaignTasks && !currentUserCampaignProgress.isCampaignFullyCompleted) {
                    await DripCampaign.updateOne(
                        { _id: updatedCampaign._id, "userCampaignProgress.userId": userIdObjectId },
                        {
                            $set: {
                                "userCampaignProgress.$.isCampaignFullyCompleted": true,
                                "userCampaignProgress.$.campaignCompletedAt": new Date()
                            }
                        }
                    );
                } else if (!hasCompletedAllCurrentCampaignTasks && currentUserCampaignProgress.isCampaignFullyCompleted) {
                     await DripCampaign.updateOne(
                        { _id: updatedCampaign._id, "userCampaignProgress.userId": userIdObjectId },
                        {
                            $set: {
                                "userCampaignProgress.$.isCampaignFullyCompleted": false,
                                "userCampaignProgress.$.campaignCompletedAt": null
                            }
                        }
                    );
                }
            }
        } else {
            console.warn(`[POST /mark-task-fully-complete] Campaign for task ${taskId} not found. Campaign progress not updated.`);
        }

        res.status(200).json({
            message: 'Task marked as DONE. Your reward will be distributed after the Campaign Ends and your submission has been verified.',
            taskId: taskId,
            userCompletionProgress: userCompletionEntry // Send back the latest state for frontend
        });

    } catch (error) {
        console.error(`[POST /mark-task-fully-complete] CRITICAL ERROR marking task ${taskId} as fully completed for user ${userId}:`, error);
        res.status(500).json({ message: 'Server error marking task as fully completed.' });
    }
});

router.post('/payout-verified-task', async (req, res) => { // For testing, no admin auth here. ADD IT IN PRODUCTION.
    const { dripEngagementRecordId, userId } = req.body;

    if (!dripEngagementRecordId || !userId) {
        return res.status(400).json({ message: 'dripEngagementRecordId and userId are required.' });
    }

    let taskObjectId, userIdObjectId;
    try {
        taskObjectId = new mongoose.Types.ObjectId(dripEngagementRecordId);
        userIdObjectId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
        console.warn(`[POST /payout-verified-task] Invalid ObjectId format for provided IDs.`);
        return res.status(400).json({ message: 'Invalid ID format.' });
    }

    try {
        // Find the task and the specific user's completion entry
        const task = await Task.findById(taskObjectId).select('completedBy earningAmount');
        if (!task) {
            console.warn(`[POST /payout-verified-task] Task not found: ${dripEngagementRecordId}`);
            return res.status(404).json({ message: 'Task not found.' });
        }

        const userCompletionEntryIndex = task.completedBy.findIndex(entry => entry.userId.equals(userIdObjectId));
        if (userCompletionEntryIndex === -1) {
            console.warn(`[POST /payout-verified-task] User ${userId} has no completion entry for task ${dripEngagementRecordId}.`);
            return res.status(400).json({ message: 'User has no completion entry for this task.' });
        }

        const userCompletionEntry = task.completedBy[userCompletionEntryIndex];

        // This check needs to be updated. It should be checking if it's pending, not if it's fully completed.
        // A task that is "fully completed" (from the user's perspective) but not yet verified
        // should have isPending: true and isFullyCompleted: false.
        // So, the condition should be: if (!userCompletionEntry.isPending) { ... }
        // However, the admin endpoint should only verify tasks that are pending *and* not yet verified/fraudulent.
        if (!userCompletionEntry.isPending || userCompletionEntry.isVerified || userCompletionEntry.isFraudulent) {
             console.warn(`[POST /payout-verified-task] Task ${dripEngagementRecordId} not in a verifiable state for user ${userId}. Payout skipped.`);
             let message = 'Task not in a verifiable state.';
             if (userCompletionEntry.isVerified) message = 'Task already verified.';
             if (userCompletionEntry.isFraudulent) message = 'Task marked as fraudulent.';
             if (!userCompletionEntry.isPending) message = 'Task not submitted for verification.';
             return res.status(400).json({ message: message });
        }


        // Update the task entry to mark it as verified and no longer pending
        const updateResult = await Task.updateOne(
            { _id: taskObjectId, 'completedBy.userId': userIdObjectId },
            {
                $set: {
                    'completedBy.$.isVerified': true,
                    'completedBy.$.isPending': false, // Set isPending to false upon verification/payout
                    'completedBy.$.isFullyCompleted': true // Admin verification makes it truly fully completed
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            console.error(`[POST /payout-verified-task] Failed to find matching task/user entry for verification update: ${dripEngagementRecordId}, user ${userId}.`);
            return res.status(500).json({ message: 'Failed to update task verification status.' });
        }
        if (updateResult.modifiedCount === 0) {
             console.warn(`[POST /payout-verified-task] Task ${dripEngagementRecordId} verification status for user ${userId} not modified. Possibly already updated or no change needed.`);
        }

        const earningAmount = task.earningAmount;
        if (earningAmount === undefined || earningAmount === null) {
            console.error(`[POST /payout-verified-task] Earning amount not defined for task ${taskObjectId}.`);
            return res.status(500).json({ message: 'Earning amount not defined for this task.' });
        }

        const userUpdateResult = await User.updateOne(
            { _id: userIdObjectId },
            { $inc: { earnings: earningAmount } } // Add to total earnings
        );

        if (userUpdateResult.matchedCount === 0) {
            console.warn(`[POST /payout-verified-task] User ${userId} not found for payout. Task: ${dripEngagementRecordId}.`);
            return res.status(404).json({ message: 'User not found for payout.' });
        }
        if (userUpdateResult.modifiedCount === 0) {
            console.warn(`[POST /payout-verified-task] User ${userId} earnings not modified. Possibly already updated or no change needed.`);
        }

        res.status(200).json({
            message: `Earnings of ${earningAmount} successfully disbursed to user ${userId} for task ${dripEngagementRecordId}.`,
            payoutAmount: earningAmount,
            userId: userId,
            taskId: dripEngagementRecordId
        });

    } catch (error) {
        console.error(`[POST /payout-verified-task] CRITICAL ERROR during payout for task ${dripEngagementRecordId}, user ${userId}:`, error);
        res.status(500).json({ message: 'Server error during payout process.' });
    }
});

module.exports = router;