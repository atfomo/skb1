import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { Link } from 'react-router-dom';

import {
    FaHeart,
    FaSyncAlt,
    FaCommentDots,
    FaTwitter,
    FaDiscord,
    FaTelegramPlane,
    FaGlobe,
    FaExclamationCircle,
    FaExternalLinkAlt
} from 'react-icons/fa';
import TaskGroupCard from '../components/TaskGroupCard';
import './ProjectDetail.css';

// --- Helper Function for Task Name Formatting ---
const formatTaskName = (key, name) => {
    if (name) return name; // Use backend-provided name if available

    // Fallback to formatting based on key
    if (key.includes('likeX')) return 'Like X Post';
    if (key.includes('retweetX')) return 'Retweet X Post';
    if (key.includes('commentX')) return 'Comment on X Post';
    if (key.includes('followX')) return 'Follow on X';
    if (key.includes('discord')) return 'Join Discord';
    if (key.includes('telegram')) return 'Join Telegram';
    if (key.match(/^\d+$/)) return `General Task ${key}`; // For numerical keys
    return key.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

// --- ProjectDetail Component ---
const ProjectDetail = () => {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const { user, token, loadingUser: loadingAuth, isAuthenticated } = useUser();

    const [campaign, setCampaign] = useState(null);
    const [creatorDashboard, setCreatorDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userParticipations, setUserParticipations] = useState({});
    const [userTaskProgress, setUserTaskProgress] = useState({});
    const [xUser, setXUser] = useState(user?.xUsername || null); // Initialize with user's X username if available

    // NEW STATE: To manage the expanded/collapsed state of each task card
    // Stores an object where keys are taskGroup.key and values are booleans (true if expanded)
    const [expandedTaskGroups, setExpandedTaskGroups] = useState({});


    // --- Data Fetching Effect ---
    useEffect(() => {
        const fetchAllDetails = async () => {
            setLoading(true);
            setError(null);
            console.log(`[ProjectDetail] Attempting to fetch campaign: ${campaignId}`);

            try {
                // 1. Fetch Campaign Details
                const campaignRes = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}`, {
                    // This already has the token, good!
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const campaignData = await campaignRes.json();

                if (!campaignRes.ok) {
                    throw new Error(campaignData.message || 'Failed to fetch campaign details.');
                }
                setCampaign(campaignData);
                console.log("[ProjectDetail] Fetched Campaign Data:", campaignData);

                // 2. Fetch Creator Dashboard Details
                if (campaignData.createdBy && campaignData.createdBy._id) {
                    console.log(`[ProjectDetail] Fetching creator dashboard for user ID: ${campaignData.createdBy._id}`);
                    const creatorDashboardRes = await fetch(`https://api.dev.atfomo.local:5000/api/project/creator-dashboard/${campaignData.createdBy._id}`, {
                        // FIX HERE: Add the Authorization header
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const creatorDashboardData = await creatorDashboardRes.json();

                    if (creatorDashboardRes.ok && creatorDashboardData.success) {
                        setCreatorDashboard(creatorDashboardData.data);
                        console.log("[ProjectDetail] Creator dashboard fetched:", creatorDashboardData.data);
                    } else if (creatorDashboardRes.status === 404) {
                        console.warn("[ProjectDetail] Creator dashboard not found for this user.");
                        setCreatorDashboard(null);
                    } else {
                        // This else block will now correctly catch unauthorized or other server errors for dashboard fetch
                        console.error("[ProjectDetail] Failed to fetch creator dashboard:", creatorDashboardData.message || creatorDashboardData);
                        setCreatorDashboard(null);
                    }
                } else {
                    console.warn("[ProjectDetail] Campaign has no valid creator ID or creator data.");
                    setCreatorDashboard(null);
                }

                // 3. Fetch user's participations (if logged in)
                if (user && user._id && token) {
                    console.log(`[ProjectDetail] User is logged in. Fetching participations for user ${user._id} and campaign ${campaignId}`);
                    const participationsRes = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}/user-participation`, {
                        // This already has the token, good!
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const participationsData = await participationsRes.json();

                    if (participationsRes.ok) {
                        setUserParticipations(participationsData);
                        console.log("[DEBUG] Fetched User Participations (on load):", participationsData);

                        const derivedTaskProgress = {};
                        Object.keys(participationsData).forEach(taskGroupKey => {
                            const participation = participationsData[taskGroupKey];
                            derivedTaskProgress[taskGroupKey] = {};
                            if (participation.completedTasks && Array.isArray(participation.completedTasks)) {
                                participation.completedTasks.forEach(taskLinkEntry => {
                                    derivedTaskProgress[taskGroupKey][taskLinkEntry.link] = taskLinkEntry.status;
                                });
                            }
                        });
                        setUserTaskProgress(derivedTaskProgress);
                        console.log("[DEBUG] Derived User Task Progress (on load):", derivedTaskProgress);

                    } else {
                        console.warn('Failed to fetch user participations:', participationsData.message || participationsData);
                        setUserParticipations({});
                        setUserTaskProgress({});
                    }
                } else {
                    console.log("[ProjectDetail] User not logged in or token missing, skipping participations and progress fetch.");
                    setUserParticipations({});
                    setUserTaskProgress({});
                }

            } catch (err) {
                setError(err.message);
                console.error("[ProjectDetail] Error in fetchAllDetails:", err);
            } finally {
                setLoading(false);
                console.log("[ProjectDetail] Loading finished.");
            }
        };

        // Only call fetchAllDetails if authentication loading is complete.
        // This prevents trying to fetch data before the user context has settled.
        if (!loadingAuth) {
            fetchAllDetails();
        }
    }, [campaignId, user, token, loadingAuth, navigate]); // Depend on user, token, and loadingAuth


    // Update xUser if user context changes
    useEffect(() => {
        setXUser(user?.xUsername || null);
    }, [user?.xUsername]);


    // NEW HANDLER: To toggle the expanded state of a task group
    const handleToggleDetails = useCallback((taskGroupKey) => {
        setExpandedTaskGroups(prev => ({
            ...prev,
            [taskGroupKey]: !prev[taskGroupKey] // Toggle the boolean value
        }));
    }, []);

    // --- Handlers (rest of your existing handlers) ---
    const handleParticipate = useCallback(async (taskGroupKey) => {
        if (!user || !user._id || !token) {
            alert("Please log in.");
            navigate('/login');
            return;
        }
        console.log(`[ProjectDetail] Attempting to join task group: ${taskGroupKey}`);

        try {
            const res = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}/tasks/${taskGroupKey}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user._id })
            });

            const data = await res.json();
            console.log(`[ProjectDetail] Participate response status: ${res.status}`);
            console.log(`[ProjectDetail] Participate response data:`, data);

            if (!res.ok) {
                // If the error is a 409 (Conflict), it means they've already joined.
                // In this case, we need to re-fetch the participation status
                // to correctly update the UI.
                if (res.status === 409) {
                    alert(data.message + " Refreshing participation status.");
                    // Trigger a re-fetch of all participation data
                    // This is crucial to sync the UI with the backend
                    const participationsRes = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}/user-participation`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const participationsData = await participationsRes.json();

                    if (participationsRes.ok) {
                        setUserParticipations(participationsData);
                        const derivedTaskProgress = {};
                        Object.keys(participationsData).forEach(tgKey => {
                            const participation = participationsData[tgKey];
                            derivedTaskProgress[tgKey] = {};
                            if (participation.completedTasks && Array.isArray(participation.completedTasks)) {
                                participation.completedTasks.forEach(taskLinkEntry => {
                                    derivedTaskProgress[tgKey][taskLinkEntry.link] = taskLinkEntry.status;
                                });
                            }
                        });
                        setUserTaskProgress(derivedTaskProgress);
                    } else {
                        console.error("Failed to re-fetch participations after 409:", participationsData.message);
                        setUserParticipations({});
                        setUserTaskProgress({});
                    }
                    return; // Exit function after handling 409
                } else {
                    throw new Error(data.message || 'Failed to join task group.');
                }
            }

            // Update user participations for the specific task group
            setUserParticipations(prev => ({
                ...prev,
                [taskGroupKey]: data.userParticipation // Update with the new participation record
            }));

            // Update task progress for the newly joined task group
            setUserTaskProgress(prev => {
                const campaignTask = campaign?.campaignTasks.find(t => t.key === taskGroupKey);
                const initialSubTaskProgress = {};
                if (campaignTask && campaignTask.subTasks) {
                    campaignTask.subTasks.forEach(subTask => {
                        const subTaskId = subTask._id || subTask.link;
                        const completedTaskEntry = data.userParticipation.completedTasks?.find(t => t.link === subTaskId);
                        initialSubTaskProgress[subTaskId] = completedTaskEntry ? completedTaskEntry.status : 'not-started';
                    });
                }
                return {
                    ...prev,
                    [taskGroupKey]: initialSubTaskProgress
                };
            });

            // Update campaign's currentParticipants count
            setCampaign(prevCampaign => {
                if (!prevCampaign) return null;
                const updatedCampaignTasks = prevCampaign.campaignTasks.map(task =>
                    task.key === taskGroupKey ? { ...task, currentParticipants: data.currentParticipants } : task
                );
                return { ...prevCampaign, campaignTasks: updatedCampaignTasks };
            });

            alert(data.message);

        } catch (err) {
            console.error('[ProjectDetail] Join task group error:', err);
            alert(`Failed to join task group: ${err.message || 'Please try again.'}`);
        }
    }, [campaignId, token, user, navigate, campaign]);

    // This handles verification for specific sub-tasks (e.g., X actions)
    const handleVerifyTweet = useCallback(async (taskGroupKey, subTaskIdentifier, requiredContent) => {
        if (!xUser) {
            alert("Please connect your X (Twitter) account first!");
            return;
        }
        if (!user || !token) {
            alert("Please log in.");
            navigate('/login');
            return;
        }

        try {
            console.log(`[ProjectDetail] Attempting to verify tweet for task group: ${taskGroupKey}, subTask: ${subTaskIdentifier}`);
            // Optimistically update UI to 'verifying'
            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: 'verifying'
                }
            }));

            const res = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}/tasks/${taskGroupKey}/verify-x-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user._id, subTaskIdentifier, xUsername: xUser, requiredContent })
            });

            const data = await res.json();
            console.log(`[ProjectDetail] Verify X action response status: ${res.status}`);
            console.log(`[ProjectDetail] Verify X action response data:`, data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to verify X action.');
            }

            alert(data.message);

            // Update local state with the actual status
            setUserParticipations(prev => ({
                ...prev,
                [taskGroupKey]: data.userParticipation // Backend should return updated participation
            }));
            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: data.taskStatus || 'completed' // Assuming backend sends taskStatus
                }
            }));

        } catch (err) {
            console.error('[ProjectDetail] Verify X action error:', err);
            alert(`X verification failed: ${err.message || 'Please try again.'}`);
            // Revert status or mark as failed on error
            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: 'failed'
                }
            }));
        }
    }, [campaignId, token, user, xUser, navigate]);


    // MODIFIED: No longer needs 'proofLink' as a direct parameter from the UI
    const handleSubmitProof = useCallback(async (taskGroupKey, subTaskIdentifier) => {
        if (!user || !token) {
            alert("Please log in.");
            navigate('/login');
            return;
        }

        try {
            console.log(`[ProjectDetail] Submitting proof for task group ${taskGroupKey}, subTask: ${subTaskIdentifier}`);
            // Optimistically update UI to 'pending-review'
            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: 'pending-review'
                }
            }));

            const res = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}/tasks/${taskGroupKey}/submit-proof`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                // --- MODIFIED PAYLOAD HERE ---
                body: JSON.stringify({
                    userId: user._id,
                    link: subTaskIdentifier,
                    // If no proof link is needed, you can send an empty object or
                    // a simple indicator like { status: "completed_no_proof" }
                    // For now, I'll send proofLink as the subTaskIdentifier itself,
                    // assuming backend will treat this as a simple confirmation.
                    proofData: { proofLink: subTaskIdentifier } // Or {} if backend accepts empty proofData
                })
            });

            const data = await res.json();
            console.log(`[ProjectDetail] Submit proof response status: ${res.status}`);
            console.log(`[ProjectDetail] Submit proof response data:`, data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit proof.');
            }

            alert(data.message);

            // Update local state for user participation and task progress
            setUserParticipations(prev => ({
                ...prev,
                [taskGroupKey]: data.userParticipation // Backend should return updated participation
            }));
            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: data.taskStatus || 'pending-review' // Assuming backend sends taskStatus
                }
            }));

        } catch (err) {
            console.error('[ProjectDetail] Submit proof error:', err);
            alert(`Proof submission failed: ${err.message || 'Please try again.'}`);
            // Revert status or mark as failed on error
            setUserTaskProgress(prev => {
                const currentStatus = prev[taskGroupKey]?.[subTaskIdentifier];
                if (currentStatus === 'pending-review') {
                    return {
                        ...prev,
                        [taskGroupKey]: {
                            ...prev[taskGroupKey],
                            [subTaskIdentifier]: 'failed'
                        }
                    };
                }
                return prev;
            });
        }
    }, [campaignId, token, user, navigate]);

    // Inside ProjectDetail.jsx, near your other useCallback functions
    const handleUploadProof = useCallback(async (taskGroupKey, subTaskIdentifier, file) => {
    if (!user || !token) {
        alert("Please log in to upload proof.");
        navigate('/login');
        return;
    }
    if (!file) {
        alert("No file selected for upload.");
        return;
    }

    try {
        console.log(`[ProjectDetail] Uploading proof for task group ${taskGroupKey}, subTask: ${subTaskIdentifier}, file: ${file.name}`);

        // Optimistically update UI to 'verifying' or 'pending-review'
        // Decide which status is more appropriate for an *upload* before server response.
        // 'pending-review' is generally better for proofs that need manual review.
        setUserTaskProgress(prev => ({
            ...prev,
            [taskGroupKey]: {
                ...prev[taskGroupKey],
                [subTaskIdentifier]: 'pending-review' // Status while upload is in progress and awaiting review
            }
        }));

        const formData = new FormData();
        formData.append('userId', user._id);
        formData.append('link', subTaskIdentifier);
        formData.append('proofImage', file); // Make sure your backend expects 'proofImage' as the field name

        const res = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}/tasks/${taskGroupKey}/upload-proof`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to upload proof.');
        }

        alert(data.message || "Proof uploaded successfully!");

        // Update local state with the actual status returned from the backend
        setUserParticipations(prev => ({
            ...prev,
            [taskGroupKey]: data.userParticipation
        }));
        setUserTaskProgress(prev => ({
            ...prev,
            [taskGroupKey]: {
                ...prev[taskGroupKey],
                [subTaskIdentifier]: data.taskStatus || 'pending-review' // Backend should confirm final status
            }
        }));

    } catch (err) {
        console.error('[ProjectDetail] File upload error:', err);
        alert(`File upload failed: ${err.message || 'Please try again.'}`);
        // Revert status or mark as failed on error
        setUserTaskProgress(prev => ({
            ...prev,
            [taskGroupKey]: {
                ...prev[taskGroupKey],
                [subTaskIdentifier]: 'rejected' // Or 'failed', depending on your status definitions
            }
        }));
    }
    }, [campaignId, user, token, navigate]); // Add all dependencies here


    const handleLeaveTaskGroup = useCallback(async (taskGroupKey) => {
        if (!user || !token) {
            alert("Please log in.");
            navigate('/login');
            return;
        }
        if (!window.confirm(`Are you sure you want to leave the '${formatTaskName(taskGroupKey)}' task group? Your progress will be reset.`)) {
            return;
        }

        try {
            console.log(`[ProjectDetail] Attempting to leave task group: ${taskGroupKey}`);
            const res = await fetch(`https://api.dev.atfomo.local:5000/api/campaigns/${campaignId}/tasks/${taskGroupKey}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            console.log(`[ProjectDetail] Leave task group response status: ${res.status}`);
            console.log(`[ProjectDetail] Leave task group response data:`, data);

            if (!res.ok) {
                throw new Error(data.message || 'Failed to leave task group.');
            }

            alert(data.message);

            // Remove participation for this task group
            setUserParticipations(prev => {
                const newParticipations = { ...prev };
                delete newParticipations[taskGroupKey];
                return newParticipations;
            });

            // Clear task progress for this task group
            setUserTaskProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[taskGroupKey];
                return newProgress;
            });

            // Update campaign's currentParticipants count
            setCampaign(prevCampaign => {
                if (!prevCampaign) return null;
                const updatedCampaignTasks = prevCampaign.campaignTasks.map(task =>
                    task.key === taskGroupKey ? { ...task, currentParticipants: data.currentParticipants } : task
                );
                return { ...prevCampaign, campaignTasks: updatedCampaignTasks };
            });

            // OPTIONAL: Collapse the card after leaving
            setExpandedTaskGroups(prev => {
                const newExpanded = { ...prev };
                delete newExpanded[taskGroupKey];
                return newExpanded;
            });

        } catch (err) {
            console.error('[ProjectDetail] Leave task group error:', err);
            alert(`Failed to leave task group: ${err.message || 'Please try again.'}`);
        }
    }, [campaignId, token, user, navigate]);

    // --- Render Logic ---

    if (loading || loadingAuth) {
        return <div className="project-detail-container loading">Loading campaign details...</div>;
    }

    if (error) {
        return <div className="project-detail-container error">Error: {error}</div>;
    }

    if (!campaign) {
        return <div className="project-detail-container not-found">Campaign not found.</div>;
    }

    const {
        name,
        description,
        budget,
        earningTag,
        rules,
        campaignTasks,
        payoutPerUser,
        socials: campaignSocials,
        image: campaignImage
    } = campaign;

    // Destructure creator dashboard info
    const {
        username: creatorUsername,
        name: creatorName,
        bio: creatorBio,
        logo: creatorLogo,
        banner: creatorBanner,
        tags: creatorTags,
        socials: creatorSocials
    } = creatorDashboard || {};

    return (
        <div className="project-detail-page">
           {/* Creator Dashboard Section */}
            {creatorDashboard && (
                <div className="creator-dashboard-section">
                    {/* Directly use creatorBanner here */}
                    <div className="creator-banner" style={{ backgroundImage: `url(${creatorBanner})` }}>
                        {/* Directly use creatorLogo here */}
                        <img src={creatorLogo} alt={`${creatorUsername}'s Profile`} className="creator-profile-pic" />
                    </div>
                    <div className="creator-details">
                        <h2>{creatorName || creatorUsername}</h2>
                        {creatorName && <p className="creator-username">@{creatorUsername}</p>}
                        <p className="creator-bio">{creatorBio}</p>
                        {creatorTags && creatorTags.length > 0 && (
                            <div className="creator-tags">
                                {creatorTags.map(tag => (
                                    <span key={tag} className="tag">{tag}</span>
                                ))}
                            </div>
                        )}
                        {creatorSocials && (
                            <div className="creator-socials">
                                {creatorSocials.twitter && (
                                    <a href={creatorSocials.twitter} target="_blank" rel="noopener noreferrer">
                                        <FaTwitter className="social-icon" />
                                    </a>
                                )}
                                {creatorSocials.telegram && (
                                    <a href={creatorSocials.telegram} target="_blank" rel="noopener noreferrer">
                                        {/* Assuming FaTelegramPlane is imported */}
                                        <FaTelegramPlane className="social-icon" /> 
                                    </a>
                                )}
                                {creatorSocials.discord && (
                                    <a href={creatorSocials.discord} target="_blank" rel="noopener noreferrer">
                                        <FaDiscord className="social-icon" />
                                    </a>
                                )}
                                {creatorSocials.website && (
                                    <a href={creatorSocials.website} target="_blank" rel="noopener noreferrer">
                                        {/* Assuming FaExternalLinkAlt is imported */}
                                        <FaExternalLinkAlt className="social-icon" /> 
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                    <hr className="creator-section-divider" />
                </div>
            )}

            {/* Campaign Details Section */}
            <div className="project-detail-container">

                <div className="campaign-summary">
                    <div className="summary-item">
                        <span>Payout/User</span>
                        <strong>${payoutPerUser?.toFixed(2)}</strong>
                    </div>
                    <div className="summary-item">
                        <span>Task Types</span>
                        <strong>{campaignTasks?.length || 0}</strong>
                    </div>
                </div>

                <div className="campaign-content">

                    <div className="campaign-rules">
                        <h3>Campaign Rules</h3>
                        <ul>
                            {rules && rules.length > 0 ? (
                                rules.map((rule, index) => (
                                    <li key={index}>{rule}</li>
                                ))
                            ) : (
                                <li>No specific rules defined.</li>
                            )}
                        </ul>
                    </div>

                    {campaignSocials && Object.values(campaignSocials).some(s => s) && (
                        <div className="campaign-social-links">
                            <h3>Campaign Socials</h3>
                            {campaignSocials.twitter && (
                                <a href={campaignSocials.twitter} target="_blank" rel="noopener noreferrer">
                                    <FaTwitter className="social-icon" /> Twitter
                                </a>
                            )}
                            {campaignSocials.telegram && (
                                <a href={campaignSocials.telegram} target="_blank" rel="noopener noreferrer">
                                    <FaTelegramPlane className="social-icon" /> Telegram
                                </a>
                            )}
                            {campaignSocials.discord && (
                                <a href={campaignSocials.discord} target="_blank" rel="noopener noreferrer">
                                    <FaDiscord className="social-icon" /> Discord
                                </a>
                            )}
                            {campaignSocials.website && (
                                <a href={campaignSocials.website} target="_blank" rel="noopener noreferrer">
                                    <FaGlobe className="social-icon" /> Website
                                </a>
                            )}
                        </div>
                    )}

                    <h2 className="tasks-heading">Campaign Tasks</h2>
                    <div className="campaign-tasks-list">
                        {campaignTasks && campaignTasks.length > 0 ? (
                            campaignTasks.map((task) => {
                                // IMPORTANT: Determine hasJoined based on userParticipations
                                const userParticipationForTaskGroup = userParticipations[task.key];
                                const hasJoined = !!userParticipationForTaskGroup; // This is the key change here

                                const currentGroupSubTaskProgress = userTaskProgress[task.key] || {};
                                const allSubTasksCompleted = task.subTasks?.every(subTask => {
                                    const subTaskId = subTask._id || subTask.link;
                                    const status = currentGroupSubTaskProgress[subTaskId];
                                    return status === 'completed' || status === 'pending-review';
                                }) || false;

                                return (
                                    <TaskGroupCard
                                        key={task.key}
                                        task={task}
                                        userHasParticipated={hasJoined}
                                        completionStatus={allSubTasksCompleted}
                                        userTaskProgress={currentGroupSubTaskProgress}
                                        isDetailsExpanded={!!expandedTaskGroups[task.key]}
                                        onToggleDetails={() => handleToggleDetails(task.key)}
                                        onParticipate={() => handleParticipate(task.key)}
                                        onVerifyLink={handleVerifyTweet}
                                        handleSubmitProof={(taskGroupKey, subTaskIdentifier) => handleSubmitProof(taskGroupKey, subTaskIdentifier)}
                                        // ADD THIS LINE:
                                        handleUploadProof={handleUploadProof}
                                        onLeaveGroup={() => handleLeaveTaskGroup(task.key)}
                                        xUser={xUser}
                                    />
                                );
                            })
                        ) : (
                            <p className="no-tasks-message">No tasks configured for this campaign.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;