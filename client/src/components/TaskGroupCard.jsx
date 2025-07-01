import React, { useState, useCallback, useMemo, useRef } from 'react'; // Added useRef
import {
    FaExternalLinkAlt,
    FaCheckCircle,
    FaHourglassHalf,
    FaTimesCircle,
    FaChevronDown,
    FaSpinner,
    FaUserPlus,
    FaSignOutAlt,
    FaTwitter,
    FaDiscord,
    FaTelegramPlane,
    FaGlobe,
    FaUpload,
    FaCoins
} from 'react-icons/fa';
import './TaskGroupCard.css';


const TASK_TYPES = {
    X_LIKE: 'x-like',
    X_RETWEET: 'x-retweet',
    X_COMMENT: 'x-comment',
    X_FOLLOW: 'x-follow',
    DISCORD: 'discord',
    TELEGRAM: 'telegram',
    WEBSITE: 'website',
    MANUAL_UPLOAD: 'manual-upload', // For custom tasks requiring image upload
    MANUAL_LINK: 'manual-link',     // For custom tasks requiring link proof
    GENERIC_LINK: 'generic-link',   // Example for other tasks that just need a "Done" button

};


const getTaskIcon = (type) => {
    switch (type) {
        case TASK_TYPES.X_LIKE:
        case TASK_TYPES.X_RETWEET:
        case TASK_TYPES.X_COMMENT:
        case TASK_TYPES.X_FOLLOW:
            return <FaTwitter />;
        case TASK_TYPES.DISCORD:
            return <FaDiscord />;
        case TASK_TYPES.TELEGRAM:
            return <FaTelegramPlane />;
        case TASK_TYPES.WEBSITE:
        case TASK_TYPES.GENERIC_LINK:
            return <FaGlobe />;
        case TASK_TYPES.MANUAL_UPLOAD:
        case TASK_TYPES.MANUAL_LINK:
            return <FaUpload />;
        default:
            return <FaExternalLinkAlt />;
    }
};


const SubTaskItem = ({
    subTask,
    taskGroupKey,
    status, // This is the individual sub-task status: 'not-started', 'pending-review', 'verified', 'rejected'
    handleSubmitProof, // For text/link proofs and generic "Done"
    handleUploadProof, // For file uploads
    onVerifyXTask, // Renamed from onVerifyLink for clarity
    xUser,

}) => {
    const [proofLink, setProofLink] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null); // Ref for file input to clear it


    const subTaskIdentifier = useMemo(() => subTask._id || subTask.link, [subTask._id, subTask.link]);

    const isXTask = useMemo(() => [
        TASK_TYPES.X_LIKE,
        TASK_TYPES.X_RETWEET,
        TASK_TYPES.X_COMMENT,
        TASK_TYPES.X_FOLLOW
    ].includes(subTask.type), [subTask.type]);

    const isManualUploadTask = useMemo(() => subTask.type === TASK_TYPES.MANUAL_UPLOAD, [subTask.type]);
    const isManualLinkTask = useMemo(() => subTask.type === TASK_TYPES.MANUAL_LINK, [subTask.type]);



    const requiresExplicitProofInput = useMemo(() =>
        subTask.proofRequired || isManualUploadTask || isManualLinkTask,
        [subTask.proofRequired, isManualUploadTask, isManualLinkTask]
    );


    const showActionSection = useMemo(() => {

        if (status === 'verified' || status === 'pending-review') {
            return false;
        }

        return true;
    }, [status]);



    const isButtonDisabled = useMemo(() =>
        status === 'pending-review' || status === 'verified' || status === 'verifying', // Disable while verifying
        [status]
    );


    const buttonClass = useMemo(() => {
        let classes = 'action-button submit-action-button';
        if (isButtonDisabled) {
            classes += ' submit-action-button-grey';
        } else {
            classes += ' submit-action-button-green';
        }
        return classes;
    }, [isButtonDisabled]);


    const handleLinkProofSubmit = useCallback(() => {
        if (!proofLink.trim()) {
            alert("Please provide the link to your proof.");
            return;
        }
        handleSubmitProof(taskGroupKey, subTaskIdentifier, proofLink);
        setProofLink(''); // Clear input after submission
    }, [proofLink, handleSubmitProof, taskGroupKey, subTaskIdentifier]);

    const handleDoneButtonClick = useCallback(() => {


        handleSubmitProof(taskGroupKey, subTaskIdentifier, subTask.link || 'done');
    }, [subTask.link, handleSubmitProof, taskGroupKey, subTaskIdentifier]);


    const handleFileProofSubmit = useCallback(() => {
        if (!selectedFile) {
            alert("Please select a file to upload.");
            return;
        }


        if (handleUploadProof) {
            handleUploadProof(taskGroupKey, subTaskIdentifier, selectedFile);
            setSelectedFile(null); // Clear selected file state
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Clear actual file input
            }
        } else {
            alert("File upload functionality is not set up correctly (missing handler).");
            console.error(new Error("File upload handler 'handleUploadProof' missing or undefined."));
        }
    }, [selectedFile, handleUploadProof, taskGroupKey, subTaskIdentifier]);


    const handleXVerifyButtonClick = useCallback(() => {
        if (!xUser) {
            alert("Please connect your X (Twitter) account first!");
            return;
        }

        if (onVerifyXTask) {
            onVerifyXTask(taskGroupKey, subTaskIdentifier, subTask.requiredContent);
        } else {
            console.error("onVerifyXTask prop is missing or undefined.");
            alert("Error: X verification handler not available. Please contact support.");
        }
    }, [xUser, onVerifyXTask, taskGroupKey, subTaskIdentifier, subTask.requiredContent]);


    const renderStatusVisual = useCallback((currentStatus) => {
        switch (currentStatus) {
            case 'verified':
            case 'completed': // Use 'completed' for general tasks verified by proof submission
                return <span className="status-badge status-verified"><FaCheckCircle /> Verified</span>;
            case 'pending-review':
                return <span className="status-badge status-pending"><FaHourglassHalf /> Pending Review</span>;
            case 'verifying':
                return <span className="status-badge status-verifying"><FaSpinner className="spin-icon" /> Submitting...</span>;
            case 'rejected':
                return <span className="status-badge status-rejected"><FaTimesCircle /> Rejected</span>;
            case 'not-started':
            default:

                return null; // Don't show "Not Started" badge by default, it clutters the UI
        }
    }, []);

    return (
        <li className="sub-task-item">
            <div className="sub-task-main">
                <div className="sub-task-info">
                    <span className="sub-task-icon">{getTaskIcon(subTask.type)}</span>
                    <span className="sub-task-name">
                        {subTask.link ? (
                            <a href={subTask.link} target="_blank" rel="noopener noreferrer" className="task-display-link">
                                {subTask.name || subTask.link} <FaExternalLinkAlt size="0.7em" />
                            </a>
                        ) : (
                            subTask.name || 'Task'
                        )}
                    </span>
                </div>
                <div className="sub-task-controls">
                    {subTask.link && (
                        <a href={subTask.link} target="_blank" rel="noopener noreferrer" className="task-link-button">
                            Go
                        </a>
                    )}
                    {}
                    {renderStatusVisual(status)}
                </div>
            </div>

            {}
            {showActionSection && (
                <div className="sub-task-action-row">
                    {(subTask.description || subTask.requiredContent) && (
                        <div className="sub-task-description-box">
                            <strong>Instructions:</strong> {subTask.description || subTask.requiredContent}
                        </div>
                    )}

                    {isXTask && (
                        <button
                            onClick={handleXVerifyButtonClick}
                            className={buttonClass}
                            disabled={isButtonDisabled || !xUser}
                        >
                            {status === 'verifying' ? 'Verifying...' : 'Verify X Action'}
                        </button>
                    )}

                    {requiresExplicitProofInput && !isXTask && ( // Apply only if manual proof is required and it's not an X task
                        <div className="manual-proof-section">
                            {isManualLinkTask && (
                                <div className="proof-input-group">
                                    <input
                                        type="text"
                                        placeholder={subTask.proofPlaceholder || "Enter proof URL (e.g., screenshot link)"}
                                        value={proofLink}
                                        onChange={(e) => setProofLink(e.target.value)}
                                        className="proof-input"
                                        disabled={isButtonDisabled}
                                    />
                                    <button
                                        onClick={handleLinkProofSubmit}
                                        className={buttonClass}
                                        disabled={isButtonDisabled || !proofLink.trim()}
                                    >
                                        Submit Link
                                    </button>
                                </div>
                            )}

                            {isManualUploadTask && (
                                <div className="proof-input-group file-upload">
                                    <label htmlFor={`file-upload-${subTaskIdentifier}`} className={`file-upload-label ${isButtonDisabled ? 'disabled-label' : ''}`}>
                                        <FaUpload /> {selectedFile ? selectedFile.name : "Choose Image"}
                                    </label>
                                    <input
                                        id={`file-upload-${subTaskIdentifier}`}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                        className="hidden-file-input"
                                        disabled={isButtonDisabled}
                                        ref={fileInputRef} // Attach ref here
                                    />
                                    <button
                                        onClick={handleFileProofSubmit}
                                        className={buttonClass}
                                        disabled={isButtonDisabled || !selectedFile}
                                    >
                                        Submit Image
                                    </button>
                                </div>
                            )}

                            {}
                            {!(isManualLinkTask || isManualUploadTask) && subTask.proofRequired && (
                                <div className="proof-input-group">
                                    <input
                                        type="text"
                                        placeholder={subTask.proofPlaceholder || "Enter proof URL (e.g., screenshot link)"}
                                        value={proofLink}
                                        onChange={(e) => setProofLink(e.target.value)}
                                        className="proof-input"
                                        disabled={isButtonDisabled}
                                    />
                                    <button
                                        onClick={handleLinkProofSubmit}
                                        className={buttonClass}
                                        disabled={isButtonDisabled || !proofLink.trim()}
                                    >
                                        Submit Proof
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {!requiresExplicitProofInput && !isXTask && ( // If no explicit proof or X-task (just a "Done" button)
                        <button
                            onClick={handleDoneButtonClick}
                            className={buttonClass}
                            disabled={isButtonDisabled}
                        >
                            Done
                        </button>
                    )}
                </div>
            )}
        </li>
    );
};


const TaskGroupCard = ({
    task: taskGroup,
    onParticipate,
    onVerifyLink, // This prop should now be passed as 'onVerifyXTask' to SubTaskItem
    handleSubmitProof,
    handleUploadProof, // This prop is correctly received by TaskGroupCard
    onLeaveGroup,
    onCompleteGroup, // Not used in this component, consider removing if not needed elsewhere
    userHasParticipated,
    isDetailsExpanded,
    onToggleDetails,
    userTaskProgress,
    xUser
}) => {
    const {
        name: title,
        description,
        links, // Renamed from subTasks to links as per your code
        currentParticipants,
        targetParticipants,
        proofRequired, // This is a group-level proofRequired, useful for overall group status
        key: taskGroupKey,
        payoutAmount
    } = taskGroup;

    const getSubTaskStatus = useCallback((subTaskIdentifier) => {
        return userTaskProgress[taskGroupKey]?.[subTaskIdentifier] || 'not-started';
    }, [userTaskProgress, taskGroupKey]);

    const allSubTasksVerified = useMemo(() =>
        links?.every(subTask => {
            const subTaskId = subTask._id || subTask.link;
            const status = getSubTaskStatus(subTaskId);

            return status === 'verified' || status === 'completed' || status === 'pending-review';
        }) || false,
        [links, getSubTaskStatus]
    );

    const overallStatusClass = useMemo(() => {
        if (!userHasParticipated) {
            return 'not-joined';
        }
        if (allSubTasksVerified && links && links.length > 0) {
            return 'completed-group';
        }
        return 'in-progress';
    }, [userHasParticipated, allSubTasksVerified, links]);

    const renderActionButtons = useCallback(() => {
        if (userHasParticipated) {
            return (
                <>
                    <button onClick={() => onLeaveGroup(taskGroupKey)} className="action-button leave-button">
                        <FaSignOutAlt /> Leave Group
                    </button>
                    {links && links.length > 0 && allSubTasksVerified && (
                        <span className="group-completed-message"><FaCheckCircle /> Group Completed!</span>
                    )}
                </>
            );
        }
        return (
            <button
                onClick={() => onParticipate(taskGroupKey)}
                className="action-button join-button"
                disabled={currentParticipants >= targetParticipants}
            >
                {currentParticipants >= targetParticipants ? 'Group Full' : <><FaUserPlus /> Participate</>}
            </button>
        );
    }, [userHasParticipated, onLeaveGroup, taskGroupKey, onParticipate, currentParticipants, targetParticipants, allSubTasksVerified, links]);

    return (
        <div className={`task-group-card ${overallStatusClass}`}>
            <div className="card-header" onClick={onToggleDetails}>
                <div className="header-top">
                    <h3 className="card-title">{title}</h3>
                    {payoutAmount !== undefined && payoutAmount !== null && ( // Check for defined value
                        <span className="rewards-badge">
                            <FaCoins /> ${payoutAmount.toFixed(2)}
                        </span>
                    )}
                </div>
                <div className="header-bottom">
                    <span className="participants-info">
                        {currentParticipants || 0} / {targetParticipants || 'Unlimited'} Participants
                    </span>
                    <FaChevronDown className={`expand-icon ${isDetailsExpanded ? 'expanded' : ''}`} />
                </div>
            </div>

            {isDetailsExpanded && (
                <div className="card-content-area">
                    {description && <p className="task-description">{description}</p>}

                    {userHasParticipated ? (
                        <>
                            {links && links.length > 0 ? (
                                <ul className="sub-tasks-list">
                                    {links.map((subTask) => (
                                        <SubTaskItem
                                            key={subTask._id || subTask.link}
                                            subTask={subTask}
                                            taskGroupKey={taskGroupKey}
                                            status={getSubTaskStatus(subTask._id || subTask.link)}
                                            handleSubmitProof={handleSubmitProof}
                                            handleUploadProof={handleUploadProof}
                                            onVerifyXTask={onVerifyLink} // Pass the X verification handler
                                            xUser={xUser}

                                        />
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-subtasks">No specific sub-tasks for this group. Manual completion may be required.</p>
                            )}
                            <div className="card-actions-bottom">
                                {renderActionButtons()}
                            </div>
                        </>
                    ) : (
                        <div className="card-actions-bottom">
                            {renderActionButtons()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskGroupCard;