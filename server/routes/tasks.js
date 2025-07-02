const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authenticateJWT');
const checkUserStatus = require('../middleware/checkUserStatus');
const { Task, User, DripCampaign } = require('../services/db');
const mongoose = require('mongoose');

// Helper function to check if all individual actions are completed
const areAllIndividualActionsCompleted = (userCompletionEntry) => {
    return userCompletionEntry.isLiked &&
           userCompletionEntry.isRetweeted &&
           userCompletionEntry.isCommented;
};

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
        .lean();

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

            if (userIdObjectId) {
                if (task.completedBy && task.completedBy.length > 0) {
                    userCompletionEntry = task.completedBy.find(entry => entry.userId.equals(userIdObjectId));
                    if (userCompletionEntry) {
                        console.log(`[GET /available] For Task ID: ${task._id}, found userCompletionEntry:`, JSON.stringify(userCompletionEntry));
                    } else {
                        console.log(`[GET /available] For Task ID: ${task._id}, userCompletionEntry NOT found for userId: ${userId}`);
                    }
                } else {
                    console.log(`[GET /available] For Task ID: ${task._id}, 'completedBy' array is empty or undefined.`);
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

                // Frontend expects these flags
                isFullyCompletedByUser: userCompletionEntry ? userCompletionEntry.isFullyCompleted : false,
                userActionProgress: userCompletionEntry ? {
                    isLiked: userCompletionEntry.isLiked,
                    isRetweeted: userCompletionEntry.isRetweeted,
                    isCommented: userCompletionEntry.isCommented,
                } : { isLiked: false, isRetweeted: false, isCommented: false },
                isCampaignFullyCompletedByUser: userCampaignEntry ? userCampaignEntry.isCampaignFullyCompleted : false,
                campaignTweetCount: task.dripCampaign.tweet_links.length || 0
            };
        }).filter(Boolean); // Filter out any null entries

        console.log(`[GET /available] Sending ${tasksWithUserProgress.length} tasks to frontend. Example of first task's userActionProgress:`, JSON.stringify(tasksWithUserProgress[0]?.userActionProgress));

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
                        [actionFieldName]: false // Only update if the action hasn't been completed yet
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
                select: 'completedBy dripCampaign earningAmount' // Select necessary fields for subsequent logic
            }
        );

        let responseMessage = '';
        let userCompletionEntryAfterUpdate = null;

        if (!updatedTask) {
            // Case 1: Task not found, not active, or action already true
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
                    updatedTask = existingTask; // Crucial: assign existingTask to updatedTask if already true
                } else {
                    console.error(`[POST /mark-action-complete] CRITICAL: Existing user entry found, action ${actionType} is FALSE, but findOneAndUpdate returned NULL. This should not happen with corrected actionFieldName.`);
                    console.error(`[POST /mark-action-complete] Debug details:`);
                    console.error(`  Requested taskId: ${taskId}`);
                    console.error(`  Requested actionType: ${actionType}`);
                    console.error(`  Derived actionFieldName: ${actionFieldName}`);
                    console.error(`  userId from auth: ${userId}`);
                    console.error(`  userIdObjectId (converted): ${userIdObjectId.toString()}`);
                    console.error(`  Existing Task ID: ${existingTask._id.toString()}`);
                    console.error(`  Existing Task Status: ${existingTask.status}`);
                    const debugEntry = existingTask.completedBy.find(entry => entry.userId.equals(userIdObjectId));
                    if (debugEntry) {
                        console.error(`  Specific 'completedBy' entry for user: ${JSON.stringify(debugEntry)}`);
                        console.error(`  Value of ${actionFieldName} in existing entry: ${debugEntry[actionFieldName]}`);
                    } else {
                        console.error(`  User's 'completedBy' entry was NOT found in the 'existingTask' fetched immediately after findOneAndUpdate failed.`);
                        console.error(`  This suggests a very serious data or query mismatch.`);
                    }
                    return res.status(500).json({ message: 'Internal server error: Failed to update existing action. Please contact support.' });
                }
            } else {
                // Case 2: No existing user completion entry, so create and push a new one
                const newCompletionEntry = {
                    userId: userIdObjectId,
                    isLiked: actionType === 'like',
                    isRetweeted: actionType === 'retweet',
                    isCommented: actionType === 'comment',
                    isFullyCompleted: false, // Default to false, will be updated below if all actions are complete
                    completedAt: null,
                    isFraudulent: false, // Ensure these default
                    isVerified: false,   // Ensure these default
                    fraudReason: null    // Ensure these default
                };

                const pushResult = await Task.findOneAndUpdate(
                    { _id: new mongoose.Types.ObjectId(taskId), status: 'active' },
                    { $push: { completedBy: newCompletionEntry } },
                    { new: true, runValidators: true, select: 'completedBy dripCampaign earningAmount' }
                );

                if (pushResult) {
                    updatedTask = pushResult;
                    responseMessage = `${actionType} action recorded successfully.`;
                } else {
                    console.error(`[POST /mark-action-complete] Failed to push new completion entry for task ${taskId}, user ${userId}. Task not found or not active.`);
                    return res.status(500).json({ message: 'Internal server error: Failed to record action.' });
                }
            }
        } else {
            responseMessage = `${actionType} action recorded successfully.`;
        }

        // Re-fetch or ensure userCompletionEntryAfterUpdate is the latest
        userCompletionEntryAfterUpdate = updatedTask ?
            updatedTask.completedBy.find(entry => entry.userId.equals(userIdObjectId)) :
            userCompletionEntryAfterUpdate;

        if (!userCompletionEntryAfterUpdate) {
            console.error(`[POST /mark-action-complete] CRITICAL: No user completion entry found AFTER all update/push operations for task ${taskId}, user ${userId}.`);
            return res.status(500).json({ message: 'Internal server error: User completion entry missing after operation.' });
        }

        // ***** START CRITICAL CHANGE FOR "PENDING" STATUS *****
        // Check if all individual actions are now completed for this user on this task
        const allIndividualActionsCompleted = areAllIndividualActionsCompleted(userCompletionEntryAfterUpdate);

        if (allIndividualActionsCompleted && !userCompletionEntryAfterUpdate.isFullyCompleted) {
            console.log(`[POST /mark-action-complete] All individual actions completed for task ${taskId} by user ${userId}. Setting isFullyCompleted to true.`);

            // Atomically update isFullyCompleted and completedAt for this user's entry
            await Task.updateOne(
                { _id: new mongoose.Types.ObjectId(taskId), 'completedBy.userId': userIdObjectId },
                {
                    $set: {
                        'completedBy.$.isFullyCompleted': true,
                        'completedBy.$.completedAt': new Date()
                    },
                    $inc: { participationCount: 1 } // Increment task's participationCount here
                }
            );

            // Update the in-memory object so the response is accurate
            userCompletionEntryAfterUpdate.isFullyCompleted = true;
            userCompletionEntryAfterUpdate.completedAt = new Date();
        }
        // ***** END CRITICAL CHANGE *****

        // Update DripCampaign engagements (existing logic)
        if (updatedTask && updatedTask.dripCampaign) {
            const campaign = await DripCampaign.findById(updatedTask.dripCampaign);
            if (campaign) {
                campaign.engagements_by_type[actionType] = (campaign.engagements_by_type[actionType] || 0) + 1;
                campaign.current_engagements_count = (campaign.current_engagements_count || 0) + 1;
                campaign.markModified('engagements_by_type');
                await campaign.save();
                console.log(`[POST /mark-action-complete] Campaign engagement counts updated for campaign ${campaign._id}.`);
            } else {
                console.warn(`[POST /mark-action-complete] Campaign for task ${taskId} (ID: ${updatedTask.dripCampaign}) not found. Engagement count not updated.`);
            }
        } else {
            console.warn(`[POST /mark-action-complete] updatedTask or updatedTask.dripCampaign is null/undefined. Campaign metrics not updated.`);
        }

        res.status(200).json({
            message: responseMessage,
            allIndividualActionsCompleted: allIndividualActionsCompleted, // This will still be correct
            userCompletionProgress: userCompletionEntryAfterUpdate // Now `isFullyCompleted` will be true if all individual actions are done
        });

    } catch (error) {
        console.error(`[POST /mark-action-complete] CRITICAL ERROR marking action '${actionType}' as completed for task ${taskId}:`, error);
        res.status(500).json({ message: `Server error marking action '${actionType}' as completed.` });
    }
});

router.post('/:taskId/mark-task-fully-complete', authorize, checkUserStatus, async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.id;
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

        // IMPORTANT: With the fix in mark-action-complete, this check might be redundant,
        // as isFullyCompleted should already be true if all individual actions are done.
        // However, keeping it as a safeguard.
        const allIndividualActionsCompleted = areAllIndividualActionsCompleted(userCompletionEntry);

        if (!allIndividualActionsCompleted) {
            console.warn(`[POST /mark-task-fully-complete] User ${userId} has not completed all individual actions for task ${taskId} yet.`);
            return res.status(400).json({ message: 'Please complete all individual actions (like, retweet, comment) before marking as DONE.' });
        }

        if (userCompletionEntry.isFullyCompleted) {
            console.log(`[POST /mark-task-fully-complete] Task ${taskId} already marked as fully completed by user ${userId}.`);
            return res.status(200).json({
                message: 'Task already marked as fully completed by you.',
                taskId: taskId,
                userCompletionProgress: userCompletionEntry
            });
        }

        // ***** NOTE: With the change in mark-action-complete, the following update to
        // 'isFullyCompleted' and 'completedAt' is now redundant here if a user performs
        // all actions via mark-action-complete.
        // However, the $inc: { participationCount: 1 } might still be relevant if you
        // want to increment it ONLY when this "DONE" button is explicitly pressed.
        // I've moved participationCount to mark-action-complete in the provided code above.
        // If you want participationCount to increment ONLY when user clicks a final "DONE",
        // then move the $inc back here and remove it from mark-action-complete.
        const updatedTask = await Task.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(taskId), 'completedBy.userId': userIdObjectId },
            {
                $set: {
                    'completedBy.$.isFullyCompleted': true, // This should largely be true already
                    'completedBy.$.completedAt': new Date() // This should largely be set already
                }
                // $inc: { participationCount: 1 } // Moved this to mark-action-complete
            },
            { new: true, runValidators: true }
        );

        if (!updatedTask) {
            console.error(`[POST /mark-task-fully-complete] FAILED to set 'isFullyCompleted' flag for task ${taskId} by user ${userId}.`);
            return res.status(500).json({ message: 'Internal server error: Failed to update task completion status.' });
        }
        userCompletionEntry = updatedTask.completedBy.find(entry => entry.userId.equals(userIdObjectId)); // Get the updated entry

        // Update DripCampaign progress (existing logic)
        const campaign = await DripCampaign.findById(task.dripCampaign);
        if (campaign) {
            const userProgressIndexInCampaign = campaign.userCampaignProgress.findIndex(p => p.userId.equals(userIdObjectId));

            let campaignUpdateQuery = {};

            if (userProgressIndexInCampaign === -1) {
                campaignUpdateQuery.$push = {
                    userCampaignProgress: {
                        userId: userIdObjectId,
                        completedTasks: [new mongoose.Types.ObjectId(taskId)],
                        isCampaignFullyCompleted: false,
                        campaignCompletedAt: null
                    }
                };
                campaignUpdateQuery.$inc = { unique_participants_count: 1 };
                campaignUpdateQuery.$addToSet = { completedUserIds: userIdObjectId };
            } else {
                await DripCampaign.updateOne(
                    { _id: campaign._id, "userCampaignProgress.userId": userIdObjectId },
                    {
                        $addToSet: {
                            "userCampaignProgress.$.completedTasks": new mongoose.Types.ObjectId(taskId)
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

            const updatedCampaign = await DripCampaign.findById(campaign._id);
            const currentUserCampaignProgress = updatedCampaign.userCampaignProgress.find(p => p.userId.equals(userIdObjectId));

            if (currentUserCampaignProgress) {
                const allCampaignTasks = await Task.find({
                    dripCampaign: updatedCampaign._id,
                    status: 'active'
                }).select('_id');

                const allCampaignTaskIds = allCampaignTasks.map(t => t._id.toString());
                const completedTaskIdsByUser = currentUserCampaignProgress.completedTasks.map(id => id.toString());

                const hasCompletedAllCurrentCampaignTasks = allCampaignTaskIds.length > 0 &&
                                                             allCampaignTaskIds.every(campaignTaskId =>
                                                                 completedTaskIdsByUser.includes(campaignTaskId)
                                                             );

                if (hasCompletedAllCurrentCampaignTasks && !currentUserCampaignProgress.isCampaignFullyCompleted) {
                    console.log(`[POST /mark-task-fully-complete] User ${userId} has completed all tasks for campaign ${updatedCampaign._id}. Setting isCampaignFullyCompleted to true.`);
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
                    // This scenario might occur if tasks are removed from a campaign AFTER a user fully completed it.
                    console.warn(`[POST /mark-task-fully-complete] User ${userId} previously marked campaign ${updatedCampaign._id} as fully complete, but now incomplete. Resetting status.`);
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
            userCompletionProgress: userCompletionEntry
        });

    } catch (error) {
        console.error(`[POST /mark-task-fully-complete] CRITICAL ERROR marking task ${taskId} as fully completed for user ${userId}:`, error);
        res.status(500).json({ message: 'Server error marking task as fully completed.' });
    }
});

router.post('/payout-verified-task', /* ADD ADMIN AUTH HERE */ async (req, res) => {
    const { dripEngagementRecordId, userId } = req.body;

    // TODO: CRITICAL - ADD ADMIN/CREATOR AUTHENTICATION MIDDLEWARE HERE BEFORE DEPLOYMENT
    // Example: router.post('/payout-verified-task', authorize, checkAdminRole, async (req, res) => { ... });

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
        const task = await Task.findById(taskObjectId).select('completedBy earningAmount');
        if (!task) {
            console.warn(`[POST /payout-verified-task] Task not found: ${dripEngagementRecordId}`);
            return res.status(404).json({ message: 'Task not found.' });
        }

        const userCompletionEntry = task.completedBy.find(entry => entry.userId.equals(userIdObjectId));
        if (!userCompletionEntry) {
            console.warn(`[POST /payout-verified-task] User ${userId} has no completion entry for task ${dripEngagementRecordId}.`);
            return res.status(400).json({ message: 'User has no completion entry for this task.' });
        }

        if (!userCompletionEntry.isFullyCompleted) {
            console.warn(`[POST /payout-verified-task] Task ${dripEngagementRecordId} not yet marked as fully completed for user ${userId}. Payout skipped.`);
            return res.status(400).json({ message: 'Task not fully completed by user, cannot disburse earnings.' });
        }

        // ***** CRITICAL CHANGE: Prevent double payouts by checking isPaidOut *****
        if (userCompletionEntry.isPaidOut) {
            console.warn(`[POST /payout-verified-task] User ${userId} for task ${dripEngagementRecordId} has already been paid out.`);
            return res.status(400).json({ message: 'Earnings for this task have already been disbursed to this user.' });
        }
        // ***** END CRITICAL CHANGE *****

        const earningAmount = task.earningAmount;
        if (earningAmount === undefined || earningAmount === null) {
            console.error(`[POST /payout-verified-task] Earning amount not defined for task ${taskObjectId}.`);
            return res.status(500).json({ message: 'Earning amount not defined for this task.' });
        }

        // Start a session for atomicity if possible, especially if you have multiple updates
        // const session = await mongoose.startSession();
        // session.startTransaction();

        try {
            // Update user's earnings
            const userUpdateResult = await User.updateOne(
                { _id: userIdObjectId },
                { $inc: { earnings: earningAmount } }
                // { session } // Pass session here
            );

            if (userUpdateResult.matchedCount === 0) {
                console.warn(`[POST /payout-verified-task] User ${userId} not found for payout. Task: ${dripEngagementRecordId}.`);
                // await session.abortTransaction();
                return res.status(404).json({ message: 'User not found for payout.' });
            }
            if (userUpdateResult.modifiedCount === 0) {
                console.warn(`[POST /payout-verified-task] User ${userId} earnings not modified. Possibly already updated or no change needed.`);
            }

            // ***** CRITICAL CHANGE: Mark the task as paid out *****
            await Task.updateOne(
                { _id: taskObjectId, 'completedBy.userId': userIdObjectId },
                { $set: { 'completedBy.$.isPaidOut': true } }
                // { session } // Pass session here
            );
            // ***** END CRITICAL CHANGE *****

            // await session.commitTransaction();

            res.status(200).json({
                message: `Earnings of ${earningAmount} successfully disbursed to user ${userId} for task ${dripEngagementRecordId}.`,
                payoutAmount: earningAmount,
                userId: userId,
                taskId: dripEngagementRecordId
            });

        } catch (transactionError) {
            // await session.abortTransaction();
            console.error(`[POST /payout-verified-task] Transaction error during payout for task ${dripEngagementRecordId}, user ${userId}:`, transactionError);
            throw transactionError; // Re-throw to be caught by outer catch
        } finally {
            // session.endSession();
        }

    } catch (error) {
        console.error(`[POST /payout-verified-task] CRITICAL ERROR during payout for task ${dripEngagementRecordId}, user ${userId}:`, error);
        res.status(500).json({ message: 'Server error during payout process.' });
    }
});

module.exports = router;