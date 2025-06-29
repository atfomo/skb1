const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authenticateJWT'); // Renamed authenticateJWT for clarity if 'authorize' is preferred
const checkUserStatus = require('../middleware/checkUserStatus'); // Your new status check middleware
const { Task, User, DripCampaign } = require('../services/db'); // Assuming db.js exports these models
const mongoose = require('mongoose');

// --- GET /api/tasks/available route ---
// REMOVED authorize and checkUserStatus middleware from this route
router.get('/available', async (req, res) => {
    // userId will only be available if the user is authenticated.
    // We need to handle this gracefully for unauthenticated access.
    // Note: req.user.id is string, so convert to ObjectId for comparison if needed
    const userId = req.user ? req.user.id : null;
    const userIdObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    if (userId) {
        console.log(`[GET /available] Authenticated user ${userId} requesting available tasks.`);
    } else {
        console.log(`[GET /available] Unauthenticated user requesting available tasks.`);
    }

    try {
        const availableTasks = await Task.find({
            status: 'active',
        })
        .populate('dripCampaign', 'package_id status end_time unique_participants_count userCampaignProgress tweet_links')
        .populate('creatorId', 'username profilePictureUrl')
        .sort({ createdAt: -1 });

        console.log(`[GET /available] Found ${availableTasks.length} active tasks.`);

        let filteredTasks = availableTasks.filter(task => {
            if (!task.dripCampaign) {
                console.warn(`[GET /available] Task ${task._id} has no associated DripCampaign or it failed to populate. Skipping.`);
                return false;
            }

            const campaignEnded = new Date() > task.dripCampaign.end_time;
            const campaignActive = task.dripCampaign.status === 'active';

            if (!campaignActive) {
                console.log(`[GET /available] Task ${task._id} campaign ${task.dripCampaign._id} is not active. Skipping.`);
            }
            if (campaignEnded) {
                console.log(`[GET /available] Task ${task._id} campaign ${task.dripCampaign._id} has ended. Skipping.`);
            }

            // Only return tasks if the campaign is active AND has not ended
            return campaignActive && !campaignEnded;
        });

        console.log(`[GET /available] Filtered to ${filteredTasks.length} truly available tasks.`);

        const tasksWithUserProgress = filteredTasks.map(task => {
            if (!task.dripCampaign) {
                console.error(`[GET /available] Unexpected null/undefined dripCampaign for task ${task._id} in map. Returning null.`);
                return null;
            }

            let userCompletionEntry = null;
            let userCampaignEntry = null;

            // Only attempt to find user-specific data if userId is available (i.e., user is authenticated)
            if (userIdObjectId) { // Use ObjectId for comparison
                userCompletionEntry = task.completedBy.find(entry => entry.userId.equals(userIdObjectId));
                userCampaignEntry = task.dripCampaign.userCampaignProgress?.find(entry => entry.userId.equals(userIdObjectId));
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

                // Frontend will rely on these flags
                // These will be false for unauthenticated users, which is correct.
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

        console.log(`[GET /available] Sending ${tasksWithUserProgress.length} tasks with user progress (if authenticated).`);
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

    console.log(`\n--- [POST /mark-action-complete] START: Task ${taskId}, User ${userId} (ObjectId: ${userIdObjectId}), Action ${actionType} ---`);

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
            actionFieldName = 'isRetweeted'; // Corrected to match schema
            break;
        case 'comment':
            actionFieldName = 'isCommented'; // Corrected to match schema
            break;
        default:
            // This case should ideally not be hit due to the initial check, but good for robustness
            console.error(`[POST /mark-action-complete] Unexpected action type: ${actionType}`);
            return res.status(400).json({ message: 'Invalid action type provided.' });
    }

    try {
        console.log(`[POST /mark-action-complete] Attempting findOneAndUpdate for Task: ${taskId}, User: ${userIdObjectId}, Action: ${actionFieldName}`);

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

        console.log(`[POST /mark-action-complete] findOneAndUpdate result:`, updatedTask ? 'Document updated.' : 'No document found/updated by findOneAndUpdate.');

        let responseMessage = '';
        let userCompletionEntryAfterUpdate = null; // Will hold the final state of the user's completion entry

        if (!updatedTask) {
                console.log(`[POST /mark-action-complete] findOneAndUpdate returned null. Fetching existingTask to analyze...`);
                const existingTask = await Task.findById(taskId).select('completedBy status dripCampaign earningAmount');

                if (!existingTask || existingTask.status !== 'active') {
                    console.warn(`[POST /mark-action-complete] Task ${taskId} not found or not active after findOneAndUpdate failure.`);
                    return res.status(404).json({ message: 'Task not found or not active.' });
                }

                console.log(`[POST /mark-action-complete] Existing Task found. Checking user completion entry...`);
                const existingUserCompletionEntry = existingTask.completedBy.find(entry => entry.userId.equals(userIdObjectId));

                if (existingUserCompletionEntry) {
                    console.log(`[POST /mark-action-complete] User completion entry found. Current state of ${actionFieldName}: ${existingUserCompletionEntry[actionFieldName]}`);
                    if (existingUserCompletionEntry[actionFieldName]) {
                        responseMessage = `Action '${actionType}' for task was already completed by user.`;
                        console.log(`[POST /mark-action-complete] Action '${actionType}' for task ${taskId} by user ${userId} was already true.`);
                        userCompletionEntryAfterUpdate = existingUserCompletionEntry; // Set for response
                        updatedTask = existingTask; // crucial: assign existingTask to updatedTask if already true
                    } else {
                        // This path should now mainly be hit if there's a serious data inconsistency
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
                // User has no completion entry for this task - push a new one
                console.log(`[POST /mark-action-complete] User ${userId} has no completion entry for task ${taskId}. Pushing new entry.`);
                const newCompletionEntry = {
                    userId: userIdObjectId,
                    isLiked: actionType === 'like',
                    isRetweeted: actionType === 'retweet',
                    isCommented: actionType === 'comment',
                    isFullyCompleted: false,
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
                    console.log(`[POST /mark-action-complete] Success: New completion entry pushed for user ${userId}.`);
                } else {
                    console.error(`[POST /mark-action-complete] Failed to push new completion entry for task ${taskId}, user ${userId}. Task not found or not active.`);
                    return res.status(500).json({ message: 'Internal server error: Failed to record action.' });
                }
            }
        } else {
            responseMessage = `${actionType} action recorded successfully.`;
            console.log(`[POST /mark-action-complete] Individual action ${actionType} for Task ${taskId} successfully marked by findOneAndUpdate.`);
        }

        // Ensure userCompletionEntryAfterUpdate is correctly set for the response
        userCompletionEntryAfterUpdate = updatedTask ?
            updatedTask.completedBy.find(entry => entry.userId.equals(userIdObjectId)) :
            userCompletionEntryAfterUpdate; // Fallback to the one determined in the 'if (!updatedTask)' block if updatedTask is still null here (shouldn't be)


        if (!userCompletionEntryAfterUpdate) {
            console.error(`[POST /mark-action-complete] CRITICAL: No user completion entry found AFTER all update/push operations for task ${taskId}, user ${userId}.`);
            return res.status(500).json({ message: 'Internal server error: User completion entry missing after operation.' });
        }

        const allActionsForTask = ['isLiked', 'isRetweeted', 'isCommented'];
        const allIndividualActionsCompleted = allActionsForTask.every(action => userCompletionEntryAfterUpdate[action]);

        // --- Update Campaign Metrics (Engagements by Type and Current Engagements) ---
        // This log will definitively show the value of updatedTask before accessing dripCampaign
        console.log(`[POST /mark-action-complete] Debug: updatedTask value before campaign update:`, updatedTask ? 'Present' : 'NULL'); // Log if updatedTask is present

        // Check if updatedTask is not null before proceeding to access its properties
        if (updatedTask && updatedTask.dripCampaign) { // Added check for updatedTask itself
            const campaign = await DripCampaign.findById(updatedTask.dripCampaign);
            if (campaign) {
                campaign.engagements_by_type[actionType] = (campaign.engagements_by_type[actionType] || 0) + 1;
                campaign.current_engagements_count = (campaign.current_engagements_count || 0) + 1;
                campaign.markModified('engagements_by_type');
                await campaign.save();
                console.log(`[POST /mark-action-complete] Campaign ${campaign._id}: engagements_by_type[${actionType}] incremented. Total: ${campaign.engagements_by_type[actionType]}. Current total engagements: ${campaign.current_engagements_count}`);
            } else {
                console.warn(`[POST /mark-action-complete] Campaign for task ${taskId} (ID: ${updatedTask.dripCampaign}) not found. Engagement count not updated.`);
            }
        } else {
            console.warn(`[POST /mark-action-complete] updatedTask or updatedTask.dripCampaign is null/undefined. Campaign metrics not updated.`);
        }


        console.log(`[POST /mark-action-complete] Responding with message: "${responseMessage}", allIndividualActionsCompleted: ${allIndividualActionsCompleted}`);

        res.status(200).json({
            message: responseMessage,
            allIndividualActionsCompleted: allIndividualActionsCompleted,
            userCompletionProgress: userCompletionEntryAfterUpdate
        });

    } catch (error) {
        console.error(`[POST /mark-action-complete] CRITICAL ERROR marking action '${actionType}' as completed for task ${taskId}:`, error);
        res.status(500).json({ message: `Server error marking action '${actionType}' as completed.` });
    } finally {
        console.log(`--- [POST /mark-action-complete] END: Task ${taskId}, User ${userId}, Action ${actionType} ---\n`);
    }
});

router.post('/:taskId/mark-task-fully-complete', authorize, checkUserStatus, async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.id; // From authorize middleware
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    console.log(`\n--- [POST /mark-task-fully-complete] START: Task ${taskId}, User ${userId} ---`);

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

        // Verify that all individual actions are indeed completed before marking as fully completed
        const allIndividualActionsCompleted = userCompletionEntry.isLiked &&
                                               userCompletionEntry.isRetweeted &&
                                               userCompletionEntry.isCommented;

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

        // --- Update Task's isFullyCompleted flag and participationCount ---
        const updatedTask = await Task.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(taskId), 'completedBy.userId': userIdObjectId },
            {
                $set: {
                    'completedBy.$.isFullyCompleted': true,
                    'completedBy.$.completedAt': new Date()
                },
                $inc: { participationCount: 1 } // Increment task's participationCount for this specific task
            },
            { new: true, runValidators: true }
        );

        if (!updatedTask) {
             console.error(`[POST /mark-task-fully-complete] FAILED to set 'isFullyCompleted' flag for task ${taskId} by user ${userId}.`);
             return res.status(500).json({ message: 'Internal server error: Failed to update task completion status.' });
        }
        userCompletionEntry = updatedTask.completedBy.find(entry => entry.userId.equals(userIdObjectId)); // Get the updated entry

        console.log(`[POST /mark-task-fully-complete] Task ${taskId} successfully marked as fully completed by user ${userId}.`);

        // --- Update DripCampaign's userCampaignProgress and unique_participants_count ---
        const campaign = await DripCampaign.findById(task.dripCampaign); // Use original task to get campaign ID
        if (campaign) {
            const userProgressIndexInCampaign = campaign.userCampaignProgress.findIndex(p => p.userId.equals(userIdObjectId));

            let campaignUpdateQuery = {}; // Object to build campaign update

            if (userProgressIndexInCampaign === -1) {
                // User is completing their first task for this campaign, push new progress entry
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
                // User has already started this campaign, add the new task to their completedTasks
                // Use $addToSet to prevent duplicates in completedTasks array
                await DripCampaign.updateOne(
                    { _id: campaign._id, "userCampaignProgress.userId": userIdObjectId },
                    {
                        $addToSet: {
                            "userCampaignProgress.$.completedTasks": new mongoose.Types.ObjectId(taskId) // Use ObjectId
                        }
                    }
                );
                console.log(`[POST /mark-task-fully-complete] Campaign ${campaign._id} userCampaignProgress updated for existing user ${userId}.`);

                // Since we're here, no new push or unique participant increment needed
            }

            // Execute the main campaign update if there's anything to update (mainly for new user progress)
            if (Object.keys(campaignUpdateQuery).length > 0) {
                 await DripCampaign.updateOne(
                    { _id: campaign._id },
                    campaignUpdateQuery
                );
                console.log(`[POST /mark-task-fully-complete] DripCampaign ${campaign._id} new user progress or unique counts updated.`);
            }

            // --- Logic to check if user has completed ALL tasks for this campaign ---
            // This is done after `userCampaignProgress` is updated.
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

                console.log(`[POST /mark-task-fully-complete] Campaign ${campaign._id}: User ${userId} campaign tasks completed: ${completedTaskIdsByUser.length}/${allCampaignTaskIds.length}`);

                // Update `isCampaignFullyCompleted` status
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
                    console.log(`[POST /mark-task-fully-complete] Campaign ${updatedCampaign._id}: User ${userId} has completed ALL tasks for this campaign!`);
                } else if (!hasCompletedAllCurrentCampaignTasks && currentUserCampaignProgress.isCampaignFullyCompleted) {
                    // This scenario handles if new tasks were added to a campaign *after* user previously completed all.
                    // It resets the flag until they complete the new ones.
                     await DripCampaign.updateOne(
                        { _id: updatedCampaign._id, "userCampaignProgress.userId": userIdObjectId },
                        {
                            $set: {
                                "userCampaignProgress.$.isCampaignFullyCompleted": false,
                                "userCampaignProgress.$.campaignCompletedAt": null
                            }
                        }
                    );
                    console.log(`[POST /mark-task-fully-complete] Campaign ${updatedCampaign._id}: User ${userId} no longer has all tasks completed (new tasks were added to campaign).`);
                }
            }
        } else {
            console.warn(`[POST /mark-task-fully-complete] Campaign for task ${taskId} not found. Campaign progress not updated.`);
        }

        // --- Final Response ---
        res.status(200).json({
            message: 'Task marked as DONE. Your reward will be distributed after the Campaign Ends and your submission has been verified.',
            taskId: taskId,
            userCompletionProgress: userCompletionEntry // Send back the latest state for frontend
        });

    } catch (error) {
        console.error(`[POST /mark-task-fully-complete] CRITICAL ERROR marking task ${taskId} as fully completed for user ${userId}:`, error);
        res.status(500).json({ message: 'Server error marking task as fully completed.' });
    } finally {
        console.log(`--- [POST /mark-task-fully-complete] END: Task ${taskId}, User ${userId} ---\n`);
    }
});


// --- NEW ENDPOINT: Payout for Verified Task Completion (Admin/Automated) ---
// This endpoint should be protected, ideally with an admin-specific middleware.
// For example: authorize('admin') or a specific API key.
// router.post('/payout-verified-task', authorize('admin'), async (req, res) => { // Example admin auth
router.post('/payout-verified-task', async (req, res) => { // For testing, no admin auth here. ADD IT IN PRODUCTION.
    const { dripEngagementRecordId, userId } = req.body;

    console.log(`\n--- [POST /payout-verified-task] START: Task ${dripEngagementRecordId}, User ${userId} ---`);

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
        // Find the task and the user's completion entry
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

        // Check if the task is already fully completed AND already paid out (if you had a payout flag)
        // For now, we'll check if isFullyCompleted is true, and assume this endpoint means payout.
        if (!userCompletionEntry.isFullyCompleted) {
             console.warn(`[POST /payout-verified-task] Task ${dripEngagementRecordId} not yet marked as fully completed for user ${userId}. Payout skipped.`);
             return res.status(400).json({ message: 'Task not fully completed by user, cannot disburse earnings.' });
        }

        // IMPORTANT: Add a flag in `completedBy` subdocument or a separate collection
        // to prevent double payouts. For instance, `isPaidOut: {type: Boolean, default: false}`
        // in your `DripCompletedBySchema`.
        // If you had `isPaidOut` flag:
        // if (userCompletionEntry.isPaidOut) {
        //     console.warn(`[POST /payout-verified-task] Task ${dripEngagementRecordId} already paid out to user ${userId}.`);
        //     return res.status(200).json({ message: 'Earnings already disbursed for this task and user.' });
        // }

        const earningAmount = task.earningAmount;
        if (earningAmount === undefined || earningAmount === null) {
            console.error(`[POST /payout-verified-task] Earning amount not defined for task ${taskObjectId}.`);
            return res.status(500).json({ message: 'Earning amount not defined for this task.' });
        }

        // --- Perform Payout (Add to user's earnings) ---
        // This is the CRITICAL step for earnings disbursement.
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
            // This might happen if user's earnings are already the expected value
            // but for a payout, we usually expect modifiedCount to be 1.
        }

        console.log(`[POST /payout-verified-task] Earnings of ${earningAmount} disbursed to user ${userId} for task ${dripEngagementRecordId}.`);

        // --- Mark the specific `completedBy` entry as paid out (RECOMMENDED) ---
        // This requires an `isPaidOut` field in your DripCompletedBySchema.
        // await Task.updateOne(
        //     { _id: taskObjectId, "completedBy.userId": userIdObjectId },
        //     { $set: { "completedBy.$.isPaidOut": true } }
        // );
        // console.log(`[POST /payout-verified-task] Task ${dripEngagementRecordId} marked as paid out for user ${userId}.`);


        res.status(200).json({
            message: `Earnings of ${earningAmount} successfully disbursed to user ${userId} for task ${dripEngagementRecordId}.`,
            payoutAmount: earningAmount,
            userId: userId,
            taskId: dripEngagementRecordId
        });

    } catch (error) {
        console.error(`[POST /payout-verified-task] CRITICAL ERROR during payout for task ${dripEngagementRecordId}, user ${userId}:`, error);
        res.status(500).json({ message: 'Server error during payout process.' });
    } finally {
        console.log(`--- [POST /payout-verified-task] END: Task ${dripEngagementRecordId}, User ${userId} ---\n`);
    }
});

module.exports = router;