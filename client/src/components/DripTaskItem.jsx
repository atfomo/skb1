import React, { useState } from 'react';
import { FaHeart, FaRetweet, FaComment, FaTwitter, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import './DripTaskItem.css';

const DripTaskItem = ({ task, onActionComplete, showRewardMessageTaskId, clearRewardMessage, pendingVerificationTaskIds }) => {

    const { isFullyCompletedByUser, userActionProgress } = task;

    const [submittingAction, setSubmittingAction] = useState({
        like: false,
        retweet: false,
        comment: false
    });

    const handleActionClick = async (actionType) => {
        if (submittingAction[actionType]) return;

        setSubmittingAction(prev => ({ ...prev, [actionType]: true }));
        try {
            window.open(task.tweetLink, '_blank', 'noopener,noreferrer');
            await onActionComplete(task._id, actionType);
        } catch (error) {
            console.error(`Failed to mark ${actionType} as done:`, error);
            setSubmittingAction(prev => ({ ...prev, [actionType]: false }));
        } finally {
            if (submittingAction[actionType]) { 
                 setSubmittingAction(prev => ({ ...prev, [actionType]: false }));
            }
        }
    };

    const isNew = new Date() - new Date(task.createdAt) < (24 * 60 * 60 * 1000);

    const allIndividualActionsCompleted = userActionProgress.isLiked &&
                                          userActionProgress.isRetweeted &&
                                          userActionProgress.isCommented;

    const isPendingVerification = (allIndividualActionsCompleted && !isFullyCompletedByUser) ||
                                  (pendingVerificationTaskIds && pendingVerificationTaskIds.includes(task._id));

    const showMessageForThisTask = showRewardMessageTaskId === task._id;

    console.log(`DripTaskItem - Task ID: ${task._id}`);
    console.log(`  isFullyCompletedByUser: ${isFullyCompletedByUser}`);
    console.log(`  userActionProgress:`, userActionProgress);
    console.log(`  allIndividualActionsCompleted: ${allIndividualActionsCompleted}`);
    console.log(`  pendingVerificationTaskIds includes this task: ${pendingVerificationTaskIds ? pendingVerificationTaskIds.includes(task._id) : 'N/A'}`);
    console.log(`  Calculated isPendingVerification (DripTaskItem): ${isPendingVerification}`);


    return (
        <div className={`drip-item-row 
                         ${isNew ? 'drip-item-new-task' : ''} 
                         ${isFullyCompletedByUser ? 'drip-item-completed-task' : ''}
                         ${isPendingVerification ? 'drip-item-pending-task' : ''} {/* Add this class */}
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
                    disabled={userActionProgress.isLiked || submittingAction.like || isFullyCompletedByUser || isPendingVerification}
                >
                    {submittingAction.like ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isLiked ? <FaCheckCircle /> : <FaHeart />)}
                    <span className="action-text">{submittingAction.like ? 'Liking...' : (userActionProgress.isLiked ? 'Liked!' : 'Like')}</span>
                </button>

                <button
                    className={`drip-item-action-btn ${userActionProgress.isRetweeted ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('retweet')}
                    disabled={userActionProgress.isRetweeted || submittingAction.retweet || isFullyCompletedByUser || isPendingVerification}
                >
                    {submittingAction.retweet ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isRetweeted ? <FaCheckCircle /> : <FaRetweet />)}
                    <span className="action-text">{submittingAction.retweet ? 'Retweeting...' : (userActionProgress.isRetweeted ? 'Retweeted!' : 'Retweet')}</span>
                </button>

                <button
                    className={`drip-item-action-btn ${userActionProgress.isCommented ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('comment')}
                    disabled={userActionProgress.isCommented || submittingAction.comment || isFullyCompletedByUser || isPendingVerification}
                >
                    {submittingAction.comment ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isCommented ? <FaCheckCircle /> : <FaComment />)}
                    <span className="action-text">{submittingAction.comment ? 'Commenting...' : (userActionProgress.isCommented ? 'Commented!' : 'Comment')}</span>
                </button>
            </div>

            <div className="drip-item-earnings" data-label="Earn:">${task.earningAmount ? task.earningAmount.toFixed(2) : '0.00'}</div>

            {/* --- Status Display Logic --- */}
            <div className="drip-item-progress" data-label="Status:">
                {isFullyCompletedByUser ? (
                    <span className="drip-item-status-completed"><FaCheckCircle /> Done</span>
                ) : isPendingVerification ? (
                    <span className="drip-item-status-pending"><FaSpinner className="drip-item-spinner-icon" /> Pending</span>
                ) : (
                    <span className="drip-item-status-incomplete">Incomplete</span>
                )}
                 {showMessageForThisTask && (
                    <div className="drip-reward-message-popup">
                        Your reward will be distributed after the Campaign Ends.
                        <button onClick={clearRewardMessage} className="drip-close-message-btn">X</button>
                    </div>
                )}
            </div>

            {isNew && <span className="drip-item-new-badge">NEW</span>}
        </div>
    );
};

export default DripTaskItem;