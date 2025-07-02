import React from 'react';
import { Link } from 'react-router-dom';
import { FaTwitter, FaHeart, FaRetweet, FaComment, FaCheckCircle, FaSpinner, FaRocket, FaTasks } from 'react-icons/fa';
import './DripGrid.css';


// Removed onTaskDone from props
const DripGrid = ({ tasks, onActionComplete, showRewardMessageTaskId, clearRewardMessage, pendingVerificationTaskIds }) => {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="drip-empty-state">
                <FaTasks className="drip-empty-state-icon" />
                <h3 className="drip-empty-state-title">No Quick Tasks Available</h3>
                <p className="drip-empty-state-message">
                    It looks like there are no immediate social tasks to complete.
                    Check back later, new opportunities drop frequently!
                </p>
                <Link to="/explore" className="drip-empty-state-action-button">
                    <FaRocket className="btn-icon" /> Explore Campaigns
                </Link>
            </div>
        );
    }

    const handleIndividualActionClick = async (taskId, actionType, tweetLink) => {
        window.open(tweetLink, '_blank', 'noopener noreferrer');
        try {
            await onActionComplete(taskId, actionType);
        } catch (error) {
            console.error(`DripGrid: Error reporting action '${actionType}' for task ${taskId}:`, error);
        }
    };

    // handleDoneClick is removed as there's no DONE button

    return (
        <div className="drip-tasks-table-container">
            <div className="drip-table-header">
                <div className="drip-header-cell">Creator</div>
                <div className="drip-header-cell">Tweet / Campaign</div>
                <div className="drip-header-cell">Actions</div>
                <div className="drip-header-cell">Earn</div>
                <div className="drip-header-cell">Status</div>
            </div>

            <div className="drip-table-body">
                {tasks.map((task) => {
                    const isNew = task.createdAt && (new Date() - new Date(task.createdAt)) < (24 * 60 * 60 * 1000);
                    const isDoneByUser = task.isFullyCompletedByUser;
                    const userActionProgress = task.userActionProgress || {};

                    const allIndividualActionsCompleted = userActionProgress.isLiked &&
                                                        userActionProgress.isRetweeted &&
                                                        userActionProgress.isCommented;

                    // The logic here is key for frontend state:
                    // A task is pending verification if all individual actions are done,
                    // AND the backend hasn't marked it as fully completed.
                    // We also check if it's already in the pendingVerificationTaskIds list.
                    const isPendingVerification = (allIndividualActionsCompleted && !isDoneByUser) ||
                                                   pendingVerificationTaskIds.includes(task._id);

                    // showDoneButton is removed as per your request

                    const showMessageForThisTask = showRewardMessageTaskId === task._id;

                    return (
                        <div
                            key={task._id}
                            className={`drip-table-row ${isNew ? 'drip-new-task' : ''} ${isDoneByUser ? 'drip-completed-row' : ''} ${isPendingVerification ? 'drip-pending-row' : ''}`}
                        >
                            <div className="drip-table-cell drip-creator-info" data-label="Creator:">
                                <span className="drip-creator-name">{task.creatorName || 'N/A'}</span>
                            </div>

                            <div className="drip-table-cell drip-tweet-link-cell" data-label="Campaign:">
                                <a href={task.tweetLink} target="_blank" rel="noopener noreferrer" title="View Tweet" className="drip-tweet-link">
                                    <FaTwitter className="drip-tweet-icon" /> View Tweet
                                </a>
                            </div>

                            <div className="drip-table-cell drip-action-buttons" data-label="Actions:">
                                <button
                                    className={`drip-action-btn ${userActionProgress?.isLiked ? 'drip-action-done' : ''}`}
                                    onClick={() => handleIndividualActionClick(task._id, 'like', task.tweetLink)}
                                    title={userActionProgress?.isLiked ? "Liked" : "Like this tweet"}
                                    disabled={userActionProgress?.isLiked || isDoneByUser || isPendingVerification}
                                >
                                    <FaHeart />
                                </button>
                                <button
                                    className={`drip-action-btn ${userActionProgress?.isRetweeted ? 'drip-action-done' : ''}`}
                                    onClick={() => handleIndividualActionClick(task._id, 'retweet', task.tweetLink)}
                                    title={userActionProgress?.isRetweeted ? "Retweeted" : "Retweet this tweet"}
                                    disabled={userActionProgress?.isRetweeted || isDoneByUser || isPendingVerification}
                                >
                                    <FaRetweet />
                                </button>
                                <button
                                    className={`drip-action-btn ${userActionProgress?.isCommented ? 'drip-action-done' : ''}`}
                                    onClick={() => handleIndividualActionClick(task._id, 'comment', task.tweetLink)}
                                    title={userActionProgress?.isCommented ? "Commented" : "Comment on this tweet"}
                                    disabled={userActionProgress?.isCommented || isDoneByUser || isPendingVerification}
                                >
                                    <FaComment />
                                </button>
                            </div>

                            <div className="drip-table-cell drip-earning-amount" data-label="Earn:">
                                <span className="earning-value">${task.earningAmount ? task.earningAmount.toFixed(2) : '0.00'}</span>
                            </div>

                            <div className="drip-table-cell drip-status-cell" data-label="Status:">
                                {isDoneByUser ? (
                                    <span className="drip-status-tag drip-status-completed">
                                        <FaCheckCircle className="drip-status-icon" /> Done
                                    </span>
                                ) : isPendingVerification ? ( // This is the combined logic now
                                    <span className="drip-status-tag drip-status-pending">
                                        <FaSpinner className="drip-spinner-icon" /> Pending
                                    </span>
                                ) : (
                                    <span className="drip-status-tag drip-status-incomplete">Incomplete</span>
                                )}

                                {showMessageForThisTask && (
                                    <div className="drip-reward-message-popup">
                                        Your reward will be distributed after the Campaign Ends.
                                        <button onClick={clearRewardMessage} className="drip-close-message-btn">X</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DripGrid;