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


const formatTaskName = (key, name) => {
    if (name) return name; // Use backend-provided name if available


    if (key.includes('likeX')) return 'Like X Post';
    if (key.includes('retweetX')) return 'Retweet X Post';
    if (key.includes('commentX')) return 'Comment on X Post';
    if (key.includes('followX')) return 'Follow on X';
    if (key.includes('discord')) return 'Join Discord';
    if (key.includes('telegram')) return 'Join Telegram';
    if (key.match(/^\d+$/)) return `General Task ${key}`; // For numerical keys
    return key.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};


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



    const [expandedTaskGroups, setExpandedTaskGroups] = useState({});



    useEffect(() => {
        const fetchAllDetails = async () => {
            setLoading(true);
            setError(null);
            

            try {

                const campaignRes = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}`, {

                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const campaignData = await campaignRes.json();

                if (!campaignRes.ok) {
                    throw new Error(campaignData.message || 'Failed to fetch campaign details.');
                }
                setCampaign(campaignData);
                


                if (campaignData.createdBy && campaignData.createdBy._id) {
                    
                    const creatorDashboardRes = await fetch(`https://atfomo-beta.onrender.com/api/project/creator-dashboard/${campaignData.createdBy._id}`, {

                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const creatorDashboardData = await creatorDashboardRes.json();

                    if (creatorDashboardRes.ok && creatorDashboardData.success) {
                        setCreatorDashboard(creatorDashboardData.data);
                        
                    } else if (creatorDashboardRes.status === 404) {
                        console.warn("[ProjectDetail] Creator dashboard not found for this user.");
                        setCreatorDashboard(null);
                    } else {

                        console.error("[ProjectDetail] Failed to fetch creator dashboard:", creatorDashboardData.message || creatorDashboardData);
                        setCreatorDashboard(null);
                    }
                } else {
                    console.warn("[ProjectDetail] Campaign has no valid creator ID or creator data.");
                    setCreatorDashboard(null);
                }


                if (user && user._id && token) {
                    
                    const participationsRes = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}/user-participation`, {

                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const participationsData = await participationsRes.json();

                    if (participationsRes.ok) {
                        setUserParticipations(participationsData);
                        

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
                        

                    } else {
                        console.warn('Failed to fetch user participations:', participationsData.message || participationsData);
                        setUserParticipations({});
                        setUserTaskProgress({});
                    }
                } else {
                    
                    setUserParticipations({});
                    setUserTaskProgress({});
                }

            } catch (err) {
                setError(err.message);
                console.error("[ProjectDetail] Error in fetchAllDetails:", err);
            } finally {
                setLoading(false);
                
            }
        };



        if (!loadingAuth) {
            fetchAllDetails();
        }
    }, [campaignId, user, token, loadingAuth, navigate]); // Depend on user, token, and loadingAuth



    useEffect(() => {
        setXUser(user?.xUsername || null);
    }, [user?.xUsername]);



    const handleToggleDetails = useCallback((taskGroupKey) => {
        setExpandedTaskGroups(prev => ({
            ...prev,
            [taskGroupKey]: !prev[taskGroupKey] // Toggle the boolean value
        }));
    }, []);


    const handleParticipate = useCallback(async (taskGroupKey) => {
        if (!user || !user._id || !token) {
            alert("Please log in.");
            navigate('/login');
            return;
        }
        

        try {
            const res = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}/tasks/${taskGroupKey}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user._id })
            });

            const data = await res.json();
            
            

            if (!res.ok) {



                if (res.status === 409) {
                    alert(data.message + " Refreshing participation status.");


                    const participationsRes = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}/user-participation`, {
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


            setUserParticipations(prev => ({
                ...prev,
                [taskGroupKey]: data.userParticipation // Update with the new participation record
            }));


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
            

            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: 'verifying'
                }
            }));

            const res = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}/tasks/${taskGroupKey}/verify-x-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: user._id, subTaskIdentifier, xUsername: xUser, requiredContent })
            });

            const data = await res.json();
            
            

            if (!res.ok) {
                throw new Error(data.message || 'Failed to verify X action.');
            }

            alert(data.message);


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

            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: 'failed'
                }
            }));
        }
    }, [campaignId, token, user, xUser, navigate]);



    const handleSubmitProof = useCallback(async (taskGroupKey, subTaskIdentifier) => {
        if (!user || !token) {
            alert("Please log in.");
            navigate('/login');
            return;
        }

        try {
            

            setUserTaskProgress(prev => ({
                ...prev,
                [taskGroupKey]: {
                    ...prev[taskGroupKey],
                    [subTaskIdentifier]: 'pending-review'
                }
            }));

            const res = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}/tasks/${taskGroupKey}/submit-proof`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },

                body: JSON.stringify({
                    userId: user._id,
                    link: subTaskIdentifier,




                    proofData: { proofLink: subTaskIdentifier } // Or {} if backend accepts empty proofData
                })
            });

            const data = await res.json();
            
            

            if (!res.ok) {
                throw new Error(data.message || 'Failed to submit proof.');
            }

            alert(data.message);


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

        const res = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}/tasks/${taskGroupKey}/upload-proof`, {
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
            
            const res = await fetch(`https://atfomo-beta.onrender.com/api/campaigns/${campaignId}/tasks/${taskGroupKey}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            
            

            if (!res.ok) {
                throw new Error(data.message || 'Failed to leave task group.');
            }

            alert(data.message);


            setUserParticipations(prev => {
                const newParticipations = { ...prev };
                delete newParticipations[taskGroupKey];
                return newParticipations;
            });


            setUserTaskProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[taskGroupKey];
                return newProgress;
            });


            setCampaign(prevCampaign => {
                if (!prevCampaign) return null;
                const updatedCampaignTasks = prevCampaign.campaignTasks.map(task =>
                    task.key === taskGroupKey ? { ...task, currentParticipants: data.currentParticipants } : task
                );
                return { ...prevCampaign, campaignTasks: updatedCampaignTasks };
            });


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
           {}
            {creatorDashboard && (
                <div className="creator-dashboard-section">
                    {}
                    <div className="creator-banner" style={{ backgroundImage: `url(${creatorBanner})` }}>
                        {}
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
                                        {}
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
                                        {}
                                        <FaExternalLinkAlt className="social-icon" /> 
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                    <hr className="creator-section-divider" />
                </div>
            )}

            {}
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