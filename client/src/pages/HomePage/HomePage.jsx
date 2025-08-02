import React, { useState, useEffect, useCallback } from 'react';
import BannerScroller from '../../components/BannerScroller/BannerScroller';
import ProjectGrid from '../../components/ProjectGrid/ProjectGrid';
import DripGrid from '../../components/DripCampaign/DripGrid';
import SparkCampaignGrid from '../../components/SparkCampaignGrid/SparkCampaignGrid';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaArrowRight, FaSignInAlt, FaUserCircle, FaBuilding } from 'react-icons/fa';
import { useUser } from '../../UserContext';
import './HomePage.css';
import { API_BASE_URL } from '../../config';

const HomePage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [tasks, setTasks] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [sparkCampaigns, setSparkCampaigns] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [errorTasks, setErrorTasks] = useState(null);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [errorCampaigns, setErrorCampaigns] = useState(null);
    const [loadingSparkCampaigns, setLoadingSparkCampaigns] = useState(true);
    const [errorSparkCampaigns, setErrorSparkCampaigns] = useState(null);
    const [showRewardMessageTaskId, setShowRewardMessageTaskId] = useState(null);
    // Removed pendingVerificationTaskIds as it's no longer managed directly by HomePage
    const { user, loadingUser, hasDashboard } = useUser();
    const navigate = useNavigate();

    const [showAllTasks, setShowAllTasks] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const tasksPerPage = 50;

    const fetchTasks = useCallback(async () => {
        setLoadingTasks(true);
        setErrorTasks(null);
        try {
            const token = localStorage.getItem('jwtToken');

            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/tasks/available`, {
                method: 'GET',
                headers: headers,
            });

            if (!response.ok && response.status === 401 && !token) {
                console.warn("Unauthorized to fetch tasks without a token. Displaying no tasks for logged-out users.");
                setTasks([]);
                // No need to setPendingVerificationTaskIds here as it's deprecated.
                setLoadingTasks(false);
                return;
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch tasks');
            }

            const data = await response.json();
            // Your backend now correctly includes `isFullyCompletedByUser`, `isPendingByUser`, `isVerifiedByUser`
            // directly in the tasks fetched from /api/tasks/available.
            // So, you can directly use those flags.
            const tasksToDisplay = data.filter(task => !task.isFullyCompletedByUser);

            setTasks(tasksToDisplay);

        } catch (err) {
            console.error('Error fetching tasks:', err);
            setErrorTasks(err.message);
        } finally {
            setLoadingTasks(false);
        }
    }, [user]); // Depend on user to re-fetch when user status changes


    const fetchCampaigns = useCallback(async () => {
        setLoadingCampaigns(true);
        setErrorCampaigns(null);
        try {
            const token = localStorage.getItem('jwtToken');

            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
                method: 'GET',
                headers: headers,
            });

            if (!response.ok && response.status === 401 && !token) {
                console.warn("Unauthorized to fetch campaigns without a token. Displaying no campaigns for logged-out users.");
                setCampaigns([]);
                setLoadingCampaigns(false);
                return;
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch campaigns');
            }

            const data = await response.json();
            setCampaigns(data);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
            setErrorCampaigns(err.message);
        } finally {
            setLoadingCampaigns(false);
        }
    }, []);


    const fetchSparkCampaigns = useCallback(async () => {
        setLoadingSparkCampaigns(true);
        setErrorSparkCampaigns(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/spark-campaigns/public-active`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch public spark campaigns');
            }

            const data = await response.json();
            setSparkCampaigns(data);
        } catch (err) {
            console.error('Error fetching public spark campaigns:', err);
            setErrorSparkCampaigns(err.message);
        } finally {
            setLoadingSparkCampaigns(false);
        }
    }, []);


    useEffect(() => {
        fetchTasks();
        fetchCampaigns();
        fetchSparkCampaigns();
    }, [fetchTasks, fetchCampaigns, fetchSparkCampaigns]);


    const handleActionComplete = async (taskId, actionType) => {
        if (!user || !localStorage.getItem('jwtToken')) {
            alert("Please log in to perform this action.");
            navigate('/login');
            return;
        }

        try {
            const token = localStorage.getItem('jwtToken');
            if (!token) throw new Error("Authentication token not found.");

            let response;
            let data;

            if (['like', 'retweet', 'comment'].includes(actionType)) {
                // Handle individual actions (like, retweet, comment)
                response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/mark-action-complete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ actionType })
                });
                data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || `Failed to mark ${actionType} as done`);
                }

                // Update the state optimistically for individual actions
                setTasks(prevTasks => {
                    const updatedTasks = prevTasks.map(task => {
                        if (task._id === taskId) {
                            const newUserActionProgress = { ...task.userActionProgress };
                            if (actionType === 'like') newUserActionProgress.isLiked = true;
                            if (actionType === 'retweet') newUserActionProgress.isRetweeted = true;
                            if (actionType === 'comment') newUserActionProgress.isCommented = true;

                            // Backend response for mark-action-complete now includes userCompletionProgress
                            const backendCompletionProgress = data.userCompletionProgress;

                            const updatedAreAllIndividualActionsCompleted = backendCompletionProgress ?
                                backendCompletionProgress.isLiked && backendCompletionProgress.isRetweeted && backendCompletionProgress.isCommented :
                                newUserActionProgress.isLiked && newUserActionProgress.isRetweeted && newUserActionProgress.isCommented;

                            // `isFullyCompletedByUser` and `isPendingByUser` are managed by mark-task-fully-complete
                            // but we can reflect them if the backend sends them (e.g., in a full refresh or from a backend update).
                            // For mark-action-complete, these will likely still be false initially.
                            const updatedIsFullyCompletedByUser = backendCompletionProgress?.isFullyCompleted || false;
                            const updatedIsPendingByUser = backendCompletionProgress?.isPending || false;


                            // Show reward message if all actions are completed for the first time
                            // and it's not yet fully completed (waiting for "Mark as DONE")
                            if (updatedAreAllIndividualActionsCompleted && !task.areAllIndividualActionsCompleted && !updatedIsFullyCompletedByUser) {
                                setShowRewardMessageTaskId(taskId);
                                setTimeout(() => {
                                    clearRewardMessage();
                                }, 5000);
                            }

                            return {
                                ...task,
                                userActionProgress: newUserActionProgress,
                                areAllIndividualActionsCompleted: updatedAreAllIndividualActionsCompleted,
                                isFullyCompletedByUser: updatedIsFullyCompletedByUser,
                                isPendingByUser: updatedIsPendingByUser // Reflect the backend's current pending status
                            };
                        }
                        return task;
                    });
                    // No filtering here after individual action, let `mark-task-fully-complete` handle removal
                    return updatedTasks;
                });

            } else if (actionType === 'mark-fully-complete') {
                // Handle marking a task as fully complete
                response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/mark-task-fully-complete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });
                data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to mark task as fully complete');
                }

                // Instead of granular optimistic updates, re-fetch all tasks
                // to ensure the UI reflects the latest state from the backend (including isPendingByUser)
                fetchTasks(); // This is the most reliable way to update the task list

                setShowRewardMessageTaskId(null); // Clear any existing reward message for this task

            } else {
                console.error("HomePage: Invalid action type provided to handleActionComplete:", actionType);
                return;
            }

        } catch (error) {
            console.error(`Error completing action ${actionType} for task ${taskId}:`, error);
            alert(`Error completing action: ${error.message}`);
        }
    };

    const clearRewardMessage = useCallback(() => {
        setShowRewardMessageTaskId(null);
    }, []);

    const filteredBySearchTasks = tasks.filter(task =>
        (task.creatorName && task.creatorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.tweetLink && task.tweetLink.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task._id && task._id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredSparkCampaigns = sparkCampaigns.filter(campaign =>
        (campaign.name && campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (campaign.hashtags && campaign.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (campaign.campaignType && campaign.campaignType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (campaign._id && campaign._id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredProjects = campaigns.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.creatorType && project.creatorType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.uniqueId && project.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Logic for showing incomplete tasks or all tasks with pagination
    const tasksToShowForDripGrid = showAllTasks
        ? filteredBySearchTasks.slice((currentPage - 1) * tasksPerPage, currentPage * tasksPerPage)
        : filteredBySearchTasks.slice(0, 10); // Show up to 10 by default

    const totalPages = Math.ceil(filteredBySearchTasks.length / tasksPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleViewMoreClick = () => {
        setShowAllTasks(true);
        setCurrentPage(1);
    };

    const handleViewLessClick = () => {
        setShowAllTasks(false);
        setCurrentPage(1);
    };

    if (loadingUser || loadingTasks || loadingCampaigns || loadingSparkCampaigns) {
        return (
            <div className="homepage-loading-overlay">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading the future of Web3 engagement...</p>
            </div>
        );
    }

    if (errorTasks || errorCampaigns || errorSparkCampaigns) {
        return (
            <div className="homepage-error-message">
                <p>An error occurred while loading content:</p>
                <p className="error-details">{errorTasks || errorCampaigns || errorSparkCampaigns}</p>
                <button onClick={() => window.location.reload()} className="reload-button">Reload Page</button>
            </div>
        );
    }

    const creatorDashboardLink = user && hasDashboard ? `/creator-dashboard` : "/create-dashboard";

    return (
        <main className="homepage-main">
            <section className="hero-section glassmorphism-card">
                <BannerScroller />
                <h1 className="hero-title">Boost Your Web3 Presence. Earn Crypto.</h1>
                <p className="hero-subtitle">
                    Connect, engage, and earn rewards by participating in thrilling campaigns
                    or launching your own to supercharge your project's growth.
                </p>
                <div className="hero-cta-buttons">
                    {user ? (
                        <>
                            <Link to="/fomo-campaigns" className="action-button primary-btn">
                                <img src="/icons/search.svg" alt="Search" className="btn-icon" /> Explore Campaigns
                            </Link>
                            <Link to="/dashboard" className="action-button secondary-btn">
                                <FaUserCircle className="btn-icon" /> Your Dashboard
                            </Link>
                            <Link to={creatorDashboardLink} className="action-button tertiary-btn">
                                <FaBuilding className="btn-icon" /> Creator Hub
                            </Link>
                        </>
                    ) : (
                        <div className="hero-login-prompt">
                            <p>Ready to jump in?</p>
                            <button onClick={() => navigate("/login")} className="action-button primary-btn connect-x-btn">
                                <FaSignInAlt className="btn-icon" /> Get Started
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <section className="homepage-section drip-tasks-section glassmorphism-card">
                <h2 className="section-heading">Quick Drip Tasks</h2>
                <p className="section-description">Complete micro-tasks on social media and earn instant rewards.</p>
                <div className="search-input-group">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search tasks by creator, tweet link, or ID..."
                        className="search-input-field"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="drip-grid-container">
                    {tasksToShowForDripGrid.length > 0 ? (
                        <DripGrid
                            tasks={tasksToShowForDripGrid}
                            onActionComplete={handleActionComplete}
                            showRewardMessageTaskId={showRewardMessageTaskId}
                            clearRewardMessage={clearRewardMessage}
                            // No longer need to pass pendingVerificationTaskIds here,
                            // DripTaskItem will use task.isPendingByUser directly.
                        />
                    ) : (
                        <p className="no-tasks-message">No drip tasks available. {user ? "Check back later!" : "Please log in to see available tasks!"}</p>
                    )}
                </div>

                {!showAllTasks && filteredBySearchTasks.length > 10 && (
                    <div className="view-more-container">
                        <button onClick={handleViewMoreClick} className="action-button primary-btn">
                            View All Tasks ({filteredBySearchTasks.length - 10} more) <FaArrowRight className="btn-icon-right" />
                        </button>
                    </div>
                )}
                {showAllTasks && filteredBySearchTasks.length > tasksPerPage && (
                    <div className="pagination-controls">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="action-button pagination-btn"
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => paginate(i + 1)}
                                className={`action-button pagination-btn ${currentPage === i + 1 ? 'active-page-btn' : ''}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="action-button pagination-btn"
                        >
                            Next
                        </button>
                        <button onClick={handleViewLessClick} className="action-button pagination-btn view-less-btn">
                            View Less
                        </button>
                    </div>
                )}
            </section>

            <section className="homepage-section public-spark-campaigns-section glassmorphism-card">
                <h2 className="section-heading"> Spark Campaigns</h2>
                <p className="section-description">
                    Discover publicly available Spark Campaigns for immediate engagement.
                </p>
                {loadingSparkCampaigns ? (
                    <div className="loading-state card-loading-state">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Loading public spark campaigns...</p>
                    </div>
                ) : filteredSparkCampaigns.length > 0 ? (
                    <SparkCampaignGrid sparkCampaigns={filteredSparkCampaigns} />
                ) : (
                    <p className="no-campaigns-message">No public Spark Campaigns available at the moment. Check back soon!</p>
                )}
            </section>

            <section className="homepage-section available-campaigns-section glassmorphism-card">
                <h2 className="section-heading">FOMO Campaigns (SOON)</h2>
                <p className="section-description">Discover high-impact campaigns tailored for significant community growth and volume generation.</p>
                {loadingCampaigns ? (
                    <div className="loading-state card-loading-state">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Loading campaigns...</p>
                    </div>
                ) : filteredProjects.length > 0 ? (
                    <div className="project-grid-container-tease">
                        <ProjectGrid projects={filteredProjects} />
                        <div className="overlay-tease">
                        </div>
                    </div>
                ) : (
                    <p className="no-campaigns-message">No campaigns available. {user ? "Check back later!" : "Log in or create a dashboard to view campaigns!"}</p>
                )}
            </section>
        </main>
    );
};

export default HomePage;