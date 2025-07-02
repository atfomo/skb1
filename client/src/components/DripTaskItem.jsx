import React, { useState } from 'react';
import { FaHeart, FaRetweet, FaComment, FaTwitter, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import './DripTaskItem.css';

const DripTaskItem = ({ task, onActionComplete, showRewardMessageTaskId, clearRewardMessage }) => {
    // Destructure new properties directly from task
    const { isFullyCompletedByUser, isPendingByUser, isVerifiedByUser, userActionProgress } = task;

    const [submittingAction, setSubmittingAction] = useState({
        like: false,
        retweet: false,
        comment: false
    });

    const handleActionClick = async (actionType) => {
        // Prevent actions if the task is already fully completed, pending, or verified
        if (isFullyCompletedByUser || isPendingByUser || isVerifiedByUser || submittingAction[actionType]) return;

        setSubmittingAction(prev => ({ ...prev, [actionType]: true }));
        try {
            window.open(task.tweetLink, '_blank', 'noopener,noreferrer');
            await onActionComplete(task._id, actionType);
        } catch (error) {
            console.error(`Failed to mark ${actionType} as done:`, error);
            // Only reset submitting state if an error occurred to allow re-submission
            setSubmittingAction(prev => ({ ...prev, [actionType]: false }));
        } finally {
            // This finally block might cause issues if onActionComplete doesn't immediately
            // re-fetch or update the task's state. It's better to let the parent re-render
            // based on the new task data. If you need immediate visual feedback,
            // the onActionComplete should trigger a re-fetch of all tasks.
            // For now, removing the direct setSubmittingAction here, as `onActionComplete`
            // should typically lead to a re-render that handles the button state.
        }
    };

    const isNew = new Date() - new Date(task.createdAt) < (24 * 60 * 60 * 1000);

    const allIndividualActionsCompleted = userActionProgress.isLiked &&
                                          userActionProgress.isRetweeted &&
                                          userActionProgress.isCommented;

    // The 'Mark as Done' button should only be visible if all individual actions are done
    // AND the task is not yet fully completed (which covers pending and verified states)
    const showMarkAsDoneButton = allIndividualActionsCompleted && !isFullyCompletedByUser;

    const showMessageForThisTask = showRewardMessageTaskId === task._id;

    console.log(`DripTaskItem - Task ID: ${task._id}`);
    console.log(`  isFullyCompletedByUser: ${isFullyCompletedByUser}`);
    console.log(`  isPendingByUser: ${isPendingByUser}`);
    console.log(`  isVerifiedByUser: ${isVerifiedByUser}`);
    console.log(`  userActionProgress:`, userActionProgress);
    console.log(`  allIndividualActionsCompleted: ${allIndividualActionsCompleted}`);
    console.log(`  showMarkAsDoneButton: ${showMarkAsDoneButton}`);


    return (
        <div className={`drip-item-row 
                          ${isNew ? 'drip-item-new-task' : ''} 
                          ${isVerifiedByUser ? 'drip-item-completed-task' : ''}
                          ${isPendingByUser ? 'drip-item-pending-task' : ''}
                        `}>
            <div className="drip-item-creator" data-label="Creator:">
                {task.creatorLogo && <img src={task.creatorLogo} alt={task.creatorName} className="drip-item-creator-avatar" />}
                <span className="drip-item-creator-name">{task.creatorName || 'N/A'}</span>
            </div>

            <div className="drip-item-campaign-link" data-label="Campaign:">
                <a href={task.tweetLink} target="_blank" rel="noopener noreferrer" title="View Tweet">
                    <FaTwitter className="drip-item-tweet-icon" /> View Tweet
                </a>
            </div>

            <div className="drip-item-actions" data-label="Actions:">
                <button
                    className={`drip-item-action-btn ${userActionProgress.isLiked ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('like')}
                    disabled={userActionProgress.isLiked || submittingAction.like || isFullyCompletedByUser || isPendingByUser || isVerifiedByUser}
                >
                    {submittingAction.like ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isLiked ? <FaCheckCircle /> : <FaHeart />)}
                    <span className="action-text">{submittingAction.like ? 'Liking...' : (userActionProgress.isLiked ? 'Liked!' : 'Like')}</span>
                </button>

                <button
                    className={`drip-item-action-btn ${userActionProgress.isRetweeted ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('retweet')}
                    disabled={userActionProgress.isRetweeted || submittingAction.retweet || isFullyCompletedByUser || isPendingByUser || isVerifiedByUser}
                >
                    {submittingAction.retweet ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isRetweeted ? <FaCheckCircle /> : <FaRetweet />)}
                    <span className="action-text">{submittingAction.retweet ? 'Retweeting...' : (userActionProgress.isRetweeted ? 'Retweeted!' : 'Retweet')}</span>
                </button>

                <button
                    className={`drip-item-action-btn ${userActionProgress.isCommented ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('comment')}
                    disabled={userActionProgress.isCommented || submittingAction.comment || isFullyCompletedByUser || isPendingByUser || isVerifiedByUser}
                >
                    {submittingAction.comment ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isCommented ? <FaCheckCircle /> : <FaComment />)}
                    <span className="action-text">{submittingAction.comment ? 'Commenting...' : (userActionProgress.isCommented ? 'Commented!' : 'Comment')}</span>
                </button>
            </div>

            <div className="drip-item-earnings" data-label="Earn:">${task.earningAmount ? task.earningAmount.toFixed(2) : '0.00'}</div>

            {/* --- Status Display Logic --- */}
            <div className="drip-item-progress" data-label="Status:">
                {isVerifiedByUser ? (
                    <span className="drip-item-status-verified"><FaCheckCircle /> Verified</span>
                ) : isPendingByUser ? (
                    <span className="drip-item-status-pending"><FaSpinner className="drip-item-spinner-icon" /> Pending</span>
                ) : showMarkAsDoneButton ? (
                    <button
                        className="drip-item-status-mark-done"
                        onClick={() => onActionComplete(task._id, 'mark-fully-complete')} // Assuming you have a handler for this in parent
                        disabled={submittingAction.markFullyComplete} // You might need a separate state for this if it's an API call
                    >
                        Mark as DONE
                    </button>
                ) : (
                    <span className="drip-item-status-incomplete">Incomplete</span>
                )}
                
                {/* Reward message for pending tasks */}
                {showMessageForThisTask && isPendingByUser && ( // Show message only if task is pending
                    <div className="drip-reward-message-popup">
                        Your reward will be distributed after the Campaign Ends and your submission has been verified.
                        <button onClick={clearRewardMessage} className="drip-close-message-btn">X</button>
                    </div>
                )}
            </div>

            {isNew && <span className="drip-item-new-badge">NEW</span>}
        </div>
    );
};

export default DripTaskItem;