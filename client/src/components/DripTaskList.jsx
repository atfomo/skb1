// client/src/components/DripCampaign/DripTaskList.jsx
import React from 'react';
import DripTaskItem from './DripTaskItem'; // Assuming DripTaskItem is in the same directory or properly imported
import './DripTaskList.css'; // Link to the new CSS file

const DripTaskList = ({ tasks, onActionComplete, onTaskDone }) => { // Added onActionComplete prop
    if (!tasks || tasks.length === 0) {
        return (
            <div className="drip-list-empty-state-message"> {/* Consistent class prefix */}
                <p className="drip-list-empty-state-title">No new drip campaign tasks available right now.</p> {/* Consistent class prefix */}
                <p className="drip-list-empty-state-text">Check back soon for new opportunities!</p> {/* Consistent class prefix */}
            </div>
        );
    }

    return (
        <div className="drip-list-container"> {/* Main container class */}
            <div className="drip-list-header"> {/* Consistent class prefix */}
                <div className="drip-list-header-item">Creator</div> {/* Consistent class prefix */}
                <div className="drip-list-header-item">Campaign</div> {/* Consistent class prefix */}
                <div className="drip-list-header-item">Actions</div> {/* Consistent class prefix */}
                <div className="drip-list-header-item">Earn</div> {/* Consistent class prefix */}
                <div className="drip-list-header-item">Status</div> {/* Consistent class prefix */}
            </div>
            <div className="drip-list-body"> {/* Consistent class prefix */}
                {tasks.map(task => (
                    // Pass onActionComplete down to DripTaskItem
                    <DripTaskItem key={task._id} task={task} onActionComplete={onActionComplete} onTaskDone={onTaskDone} />
                ))}
            </div>
        </div>
    );
};

export default DripTaskList;