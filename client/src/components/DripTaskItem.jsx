import React, { useState } from 'react';
import { FaHeart, FaRetweet, FaComment, FaTwitter, FaCheckCircle, FaSpinner } from 'react-icons/fa'; // Added FaSpinner for submitting state
import './DripTaskItem.css'; // Link to the new CSS file

const DripTaskItem = ({ task, onActionComplete }) => {
    // These props now come from `task` object, which is prepared in HomePage.jsx
    const { isFullyCompletedByUser, userActionProgress } = task;

    // Local state for individual action button submission (e.g., 'Liking...', 'Retweeting...')
    const [submittingAction, setSubmittingAction] = useState({
        like: false,
        retweet: false,
        comment: false
    });

    const handleActionClick = async (actionType) => {
        // Prevent multiple clicks while submitting
        if (submittingAction[actionType]) return;

        setSubmittingAction(prev => ({ ...prev, [actionType]: true }));
        try {
            // First, open the tweet link in a new tab
            window.open(task.tweetLink, '_blank', 'noopener,noreferrer');

            // Then, call the parent handler to mark the action complete in the backend
            await onActionComplete(task._id, actionType);

        } catch (error) {
            console.error(`Failed to mark ${actionType} as done:`, error);
            // Optionally, you might want to show an alert here to the user
        } finally {
            setSubmittingAction(prev => ({ ...prev, [actionType]: false }));
        }
    };

    // Determine if it's "new" based on createdAt timestamp
    const isNew = new Date() - new Date(task.createdAt) < (24 * 60 * 60 * 1000);

    return (
        // Apply class based on overall completion status by the current user
        <div className={`drip-item-row ${isNew ? 'drip-item-new-task' : ''} ${isFullyCompletedByUser ? 'drip-item-completed-task' : ''}`}>
            <div className="drip-item-creator" data-label="Creator:"> {/* Added data-label for mobile */}
                {task.creatorLogo && <img src={task.creatorLogo} alt={task.creatorName} className="drip-item-creator-avatar" />}
                <span className="drip-item-creator-name">{task.creatorName || 'N/A'}</span>
            </div>

            <div className="drip-item-campaign-link" data-label="Campaign:"> {/* Added data-label for mobile */}
                <a href={task.tweetLink} target="_blank" rel="noopener noreferrer" title="View Tweet">
                    <FaTwitter className="drip-item-tweet-icon" /> View Tweet
                </a>
            </div>

            <div className="drip-item-actions" data-label="Actions:"> {/* Added data-label for mobile */}
                {/* Individual action buttons with completion status and disabled states */}
                <button
                    className={`drip-item-action-btn ${userActionProgress.isLiked ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('like')}
                    disabled={userActionProgress.isLiked || submittingAction.like || isFullyCompletedByUser}
                >
                    {submittingAction.like ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isLiked ? <FaCheckCircle /> : <FaHeart />)}
                    <span className="action-text">{submittingAction.like ? 'Liking...' : (userActionProgress.isLiked ? 'Liked!' : 'Like')}</span>
                </button>

                <button
                    className={`drip-item-action-btn ${userActionProgress.isRetweeted ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('retweet')}
                    disabled={userActionProgress.isRetweeted || submittingAction.retweet || isFullyCompletedByUser}
                >
                    {submittingAction.retweet ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isRetweeted ? <FaCheckCircle /> : <FaRetweet />)}
                    <span className="action-text">{submittingAction.retweet ? 'Retweeting...' : (userActionProgress.isRetweeted ? 'Retweeted!' : 'Retweet')}</span>
                </button>

                <button
                    className={`drip-item-action-btn ${userActionProgress.isCommented ? 'drip-item-action-completed' : ''}`}
                    onClick={() => handleActionClick('comment')}
                    disabled={userActionProgress.isCommented || submittingAction.comment || isFullyCompletedByUser}
                >
                    {submittingAction.comment ? <FaSpinner className="drip-item-spinner-icon" /> : (userActionProgress.isCommented ? <FaCheckCircle /> : <FaComment />)}
                    <span className="action-text">{submittingAction.comment ? 'Commenting...' : (userActionProgress.isCommented ? 'Commented!' : 'Comment')}</span>
                </button>
            </div>

            <div className="drip-item-earnings" data-label="Earn:">${task.earningAmount ? task.earningAmount.toFixed(2) : '0.00'}</div>

            {/* Display user's progress or overall completion for this task */}
            <div className="drip-item-progress" data-label="Progress:">
                {isFullyCompletedByUser ? (
                    <span className="drip-item-status-completed"><FaCheckCircle /> Fully Completed!</span>
                ) : (
                    <span className="drip-item-status-incomplete">
                        Progress:
                        {userActionProgress.isLiked ? ' L ' : ''}
                        {userActionProgress.isRetweeted ? ' R ' : ''}
                        {userActionProgress.isCommented ? ' C ' : ''}
                        {!(userActionProgress.isLiked || userActionProgress.isRetweeted || userActionProgress.isCommented) && 'None yet'}
                    </span>
                )}
            </div>

            {isNew && <span className="drip-item-new-badge">NEW</span>}
        </div>
    );
};

export default DripTaskItem;