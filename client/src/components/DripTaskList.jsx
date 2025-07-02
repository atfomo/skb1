import React from 'react';
import DripTaskItem from './DripTaskItem';
import './DripTaskList.css';

const DripTaskList = ({ tasks, onActionComplete, showRewardMessageTaskId, clearRewardMessage }) => { // Removed pendingVerificationTaskIds
    if (!tasks || tasks.length === 0) {
        return (
            <div className="drip-list-empty-state-message">
                <p className="drip-list-empty-state-title">No new drip campaign tasks available right now.</p>
                <p className="drip-list-empty-state-text">Check back soon for new opportunities!</p>
            </div>
        );
    }

    return (
        <div className="drip-list-container">
            <div className="drip-list-header">
                <div className="drip-list-header-item">Creator</div>
                <div className="drip-list-header-item">Campaign</div>
                <div className="drip-list-header-item">Actions</div>
                <div className="drip-list-header-item">Earn</div>
                <div className="drip-list-header-item">Status</div>
            </div>
            <div className="drip-list-body">
                {tasks.map(task => (
                    <DripTaskItem
                        key={task._id}
                        task={task}
                        onActionComplete={onActionComplete}
                        showRewardMessageTaskId={showRewardMessageTaskId} 
                        clearRewardMessage={clearRewardMessage} 
                    />
                ))}
            </div>
        </div>
    );
};

export default DripTaskList;