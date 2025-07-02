import React, { useState, useEffect, useCallback, useRef } from "react"; // Import useRef
import axios from "axios";
import { FaTwitter, FaUsers, FaGlobe, FaMoneyBillAlt, FaDiscord, FaCamera, FaPlusCircle, FaTimesCircle, FaEdit, FaCheckCircle, FaHourglassHalf, FaInfoCircle, FaLink, FaExclamationTriangle, FaBullhorn, FaTasks, FaChartLine, FaDollarSign, FaWallet, FaCog, FaClipboard } from "react-icons/fa"; // Added FaClipboard
import { Link, useNavigate, useParams } from "react-router-dom";
import './CreatorDashboard.css';
import { useUser } from '../../UserContext';
import { API_BASE_URL } from '../../config';

import { useDialog } from '../../context/DialogContext';
import { toast, ToastContainer } from 'react-toastify'; // Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for react-toastify



const formatRemainingTime = (endTime) => {
    const now = Date.now();
    const end = new Date(endTime).getTime();
    const diffMs = end - now;

    if (diffMs <= 0) {
        return { text: 'Completed', statusClass: 'completed' };
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(diffSeconds / (3600 * 24));
    const hours = Math.floor((diffSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    if (seconds > 0 && days === 0 && hours === 0 && minutes < 2) parts.push(`${seconds}s`);
    if (parts.length === 0) return { text: 'Just finished', statusClass: 'completed' };

    return { text: parts.join(' '), statusClass: 'active' };
};


const CreatorDashboard = () => {
    const { user, token, loadingUser, hasDashboard } = useUser();
    const navigate = useNavigate();
    const { userId } = useParams(); // Note: This userId might be different from user._id if navigating from a public profile
    const { showAlertDialog } = useDialog(); // Destructure showAlertDialog

    
    
    

    const [profileData, setProfileData] = useState(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [errorProfile, setErrorProfile] = useState(null);


    const [dripCampaigns, setDripCampaigns] = useState([]);
    const [volumeBoostCampaigns, setVolumeBoostCampaigns] = useState([]);
    const [loadingVolumeBoosts, setLoadingVolumeBoosts] = useState(true);
    const [loadingDripCampaigns, setLoadingDripCampaigns] = useState(true);
    const [errorDripCampaigns, setErrorDripCampaigns] = useState(null);
    const [errorVolumeBoosts, setErrorVolumeBoosts] = useState(null);

    const [fomoCampaigns, setFomoCampaigns] = useState([]);
    const [loadingFomoCampaigns, setLoadingFomoCampaigns] = useState(true);
    const [errorFomoCampaigns, setErrorFomoCampaigns] = useState(null);


    const [sparkCampaigns, setSparkCampaigns] = useState([]);
    const [loadingSparkCampaigns, setLoadingSparkCampaigns] = useState(true);
    const [errorSparkCampaigns, setErrorSparkCampaigns] = useState(null);
    const [copiedCampaignId, setCopiedCampaignId] = useState(null);

    const [showCreateCampaignDropdown, setShowCreateCampaignDropdown] = useState(false);
    const createCampaignDropdownRef = useRef(null); // Ref for the create campaign dropdown

    const [addTweetForm, setAddTweetForm] = useState({
        campaignId: null,
        newTweetLink: '',
        showForm: false,
        formError: null,
        formLoading: false,
    });

    const [currentTime, setCurrentTime] = useState(Date.now());


    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (createCampaignDropdownRef.current && !createCampaignDropdownRef.current.contains(event.target)) {
                setShowCreateCampaignDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    const handleCopyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success(`Copied Campaign ID: ${id.substring(0, 8)}...`, {
                position: "bottom-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        }).catch(err => {
            console.error('Failed to copy: ', err);
            toast.error('Failed to copy ID.', {
                position: "bottom-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        });
    };


    const fetchUserProfile = useCallback(async (currentUserId, authToken) => {
        
        setLoadingProfile(true);
        setErrorProfile(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/project/creator-dashboard/${currentUserId}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });
            const fetchedProfileData = response.data.data;
            

            if (!fetchedProfileData || Object.keys(fetchedProfileData).length === 0) {
                
                setErrorProfile("No creator dashboard found. Please create one.");

                return;
            }
            setProfileData({
                username: fetchedProfileData.username || "",
                name: fetchedProfileData.name || "",
                description: fetchedProfileData.description || "",
                tags: fetchedProfileData.tags ? fetchedProfileData.tags.join(', ') : "",
                twitter: fetchedProfileData.socials?.twitter || "",
                website: fetchedProfileData.socials?.website || "",
                discord: fetchedProfileData.socials?.discord || "",
                logo: null, // Keep file objects null initially
                banner: null, // Keep file objects null initially

                previewLogo: fetchedProfileData.logo || "https://placehold.co/100x100/1a1a1a/00e676?text=LOGO", // Use directly
                previewBanner: fetchedProfileData.banner || "https://placehold.co/1200x250/1a1a1a/00e676?text=BANNER", // Use directly

            });
            console.log('CreatorDashboard (Frontend): Profile data state updated:', {
                username: fetchedProfileData.username || "",
                name: fetchedProfileData.name || "",
                description: fetchedProfileData.description || "",
                tags: fetchedProfileData.tags ? fetchedProfileData.tags.join(', ') : "",
                twitter: fetchedProfileData.socials?.twitter || "",
                website: fetchedProfileData.socials?.website || "",
                discord: fetchedProfileData.socials?.discord || "",
                previewLogo: fetchedProfileData.logo ? `${API_BASE_URL}${fetchedProfileData.logo}` : "https://placehold.co/100x100/1a1a1a/00e676?text=LOGO",
                previewBanner: fetchedProfileData.banner ? `${API_BASE_URL}${fetchedProfileData.banner}` : "https://placehold.co/1200x250/1a1a1a/00e676?text=BANNER",
            });
        } catch (err) {
            console.error("CreatorDashboard (Frontend): Error fetching creator profile:", err.response?.data || err.message);
            if (err.response && (err.response.status === 404 || err.response.status === 401 || err.response.status === 403)) {
                setErrorProfile("No dashboard found or unauthorized. Redirecting to creation page.");
                navigate('/create-dashboard'); // This seems like the intended flow if no dashboard exists
            } else {
                setErrorProfile("Failed to load creator profile due to a server error.");
            }
        } finally {
            setLoadingProfile(false);
            
        }
    }, [navigate]);

    const fetchVolumeBoostCampaigns = useCallback(async (currentUserId, authToken) => {
        
        setLoadingVolumeBoosts(true);
        setErrorVolumeBoosts(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/boost-volume/creator/${currentUserId}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });
            const campaignsWithParsedTime = (response.data.campaigns || []).map(campaign => ({
                ...campaign,
                end_time: campaign.end_time ? new Date(campaign.end_time) : null
            }));
            setVolumeBoostCampaigns(campaignsWithParsedTime);
            
        } catch (err) {
            console.error("CreatorDashboard (Frontend): Error fetching volume boost campaigns:", err.response?.data || err.message);
            setErrorVolumeBoosts(err.response?.data?.message || "Failed to load volume boost campaigns.");
            setVolumeBoostCampaigns([]);
        } finally {
            setLoadingVolumeBoosts(false);
            
        }
    }, []);

    const fetchDripCampaigns = useCallback(async (currentUserId, authToken) => {
        
        setLoadingDripCampaigns(true);
        setErrorDripCampaigns(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/drip-campaigns/creator/${currentUserId}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });
            const campaignsWithParsedTime = (response.data.campaigns || []).map(campaign => ({
                ...campaign,
                end_time: campaign.end_time ? new Date(campaign.end_time) : null
            }));
            setDripCampaigns(campaignsWithParsedTime);
            
        } catch (err) {
            console.error("CreatorDashboard (Frontend): Error fetching drip campaigns:", err.response?.data || err.message);
            setErrorDripCampaigns(err.response?.data?.message || "Failed to load drip campaigns.");
            setDripCampaigns([]);
        } finally {
            setLoadingDripCampaigns(false);
            
        }
    }, []);


    const fetchSparkCampaigns = useCallback(async (currentUserId, authToken) => {
        
        setLoadingSparkCampaigns(true);
        setErrorSparkCampaigns(null);
        try {

            const response = await axios.get(`${API_BASE_URL}/api/spark-campaigns/creator/${currentUserId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            const campaignsWithParsedTime = (response.data.data || []).map(campaign => ({
                ...campaign,
                end_time: campaign.end_time ? new Date(campaign.end_time) : null
            }));
            setSparkCampaigns(campaignsWithParsedTime);
            
        } catch (err) {
            console.error("Error fetching Spark campaigns:", err.response?.data?.message || err.message);
            setErrorSparkCampaigns(err.response?.data?.message || 'Failed to fetch Spark campaigns.');
            setSparkCampaigns([]);
        } finally {
            setLoadingSparkCampaigns(false);
        }
    }, []);


    useEffect(() => {
        const fetchFomoCampaigns = async () => {
            if (!user || !user._id || !token) {
                setErrorFomoCampaigns("Please log in to view your FOMO campaigns.");
                setLoadingFomoCampaigns(false);
                return;
            }

            setLoadingFomoCampaigns(true);
            setErrorFomoCampaigns(null);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/campaigns/creator/${user._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFomoCampaigns(response.data.campaigns || []);
            } catch (err) {
                console.error("Error fetching FOMO campaigns:", err.response?.data?.message || err.message);
                setErrorFomoCampaigns(err.response?.data?.message || 'Failed to fetch FOMO campaigns.');
            } finally {
                setLoadingFomoCampaigns(false);
            }
        };

        fetchFomoCampaigns();
    }, [user, token]);


    useEffect(() => {
        
        

        if (loadingUser) {
            
            return;
        }

        if (!user || !user._id || !token) {
            
            navigate('/login');
            return;
        }


        if (user && user._id && token && hasDashboard) {
            
            fetchUserProfile(user._id, token);
            fetchDripCampaigns(user._id, token);
            fetchVolumeBoostCampaigns(user._id, token);
            fetchSparkCampaigns(user._id, token); // NEW: Fetch Spark Campaigns
        } else if (user && user._id && token && !hasDashboard) {
            
            navigate('/create-dashboard');
        }

    }, [user, token, loadingUser, hasDashboard, navigate, fetchUserProfile, fetchDripCampaigns, fetchVolumeBoostCampaigns, fetchSparkCampaigns]);


    useEffect(() => {
        const currentProfileData = profileData;
        return () => {
            if (currentProfileData) {
                if (currentProfileData.previewLogo && typeof currentProfileData.previewLogo === 'string' && currentProfileData.previewLogo.startsWith('blob:')) {
                    URL.revokeObjectURL(currentProfileData.previewLogo);
                    
                }
                if (currentProfileData.previewBanner && typeof currentProfileData.previewBanner === 'string' && currentProfileData.previewBanner.startsWith('blob:')) {
                    URL.revokeObjectURL(currentProfileData.previewBanner);
                    
                }
            }
        };
    }, [profileData]);

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        
        if (files && files[0]) {
            const file = files[0];
            const previewUrlKey = `preview${name.charAt(0).toUpperCase() + name.slice(1)}`;

            if (profileData && profileData[previewUrlKey] && typeof profileData[previewUrlKey] === 'string' && profileData[previewUrlKey].startsWith('blob:')) {
                URL.revokeObjectURL(profileData[previewUrlKey]);
                
            }

            setProfileData((prev) => {
                const newState = {
                    ...prev,
                    [name]: file,
                    [previewUrlKey]: URL.createObjectURL(file),
                };
                
                return newState;
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData((prev) => {
            const newState = { ...prev, [name]: value };
            
            return newState;
        });
    };

    const handleSubmitProfile = async (e) => {
        e.preventDefault();
        
        if (!user || !user._id || !token) {
            console.warn("CreatorDashboard: User not logged in, preventing profile update.");
            showAlertDialog({
                title: "Authentication Required",
                message: "You must be logged in to update your profile.",
                type: "error"
            });
            return;
        }

        const data = new FormData();
        Object.keys(profileData).forEach((key) => {
            if (key === 'logo' || key === 'banner') {
                if (profileData[key] instanceof File) {
                    data.append(key, profileData[key]);
                    
                }
            } else if (!key.startsWith('preview') && profileData[key] !== null && profileData[key] !== undefined) {
                data.append(key, profileData[key]);
                
            }
        });
        data.append("ownerId", user._id);
        

        try {
            const response = await axios.post(`${API_BASE_URL}/api/project/creator-dashboard`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data', // Important for FormData
                },
            });
            
            showAlertDialog({
                title: "Profile Updated",
                message: "Your profile has been updated successfully!",
                type: "success"
            });
            setEditingProfile(false);

            const updatedData = response.data.data;
            setProfileData(prev => ({
                ...prev,
                ...updatedData,
                tags: updatedData.tags ? updatedData.tags.join(', ') : "",
                twitter: updatedData.socials?.twitter || "",
                website: updatedData.socials?.website || "",
                discord: updatedData.socials?.discord || "",

                previewLogo: updatedData.logo || "https://placehold.co/100x100/1a1a1a/e64a19?text=LOGO", // Use directly
                previewBanner: updatedData.banner || "https://placehold.co/1200x250/1a1a1a/e64a19?text=BANNER", // Use directly

                logo: null, // Reset file objects
                banner: null, // Reset file objects
            }));
            


        } catch (err) {
            console.error("CreatorDashboard (Frontend): Error submitting profile form:", err.response?.data || err.message, err);
            let errorMessage = "Error updating profile: Unknown error.";
            if (err.response) {
                errorMessage = `Error updating profile: ${err.response.data.message || 'Server error'}`;
            } else if (err.message) {
                errorMessage = `Error updating profile: ${err.message || 'Network error'}`;
            }
            setAddTweetForm(prev => ({ ...prev, formError: errorMessage, formLoading: false }));
            showAlertDialog({
                title: "Update Failed",
                message: errorMessage,
                type: "error"
            });
        }
    };

    const handleAddTweetToCampaign = async (e) => {
        e.preventDefault();
        const { campaignId, newTweetLink } = addTweetForm;
        

        if (!campaignId || !newTweetLink.trim()) {
            const errorMessage = "Tweet link cannot be empty. Please ensure your backend allows this format if it's not a URL.";
            setAddTweetForm(prev => ({ ...prev, formError: errorMessage }));
            console.warn(`CreatorDashboard: Validation failed - ${errorMessage}`);
            return;
        }
        if (!token) {
            const errorMessage = "Authentication required to add tweet.";
            setAddTweetForm(prev => ({ ...prev, formError: errorMessage }));
            console.warn(`CreatorDashboard: Validation failed - ${errorMessage}`);
            return;
        }

        setAddTweetForm(prev => ({ ...prev, formLoading: true, formError: null }));

        try {
            const response = await axios.post(`${API_BASE_URL}/api/drip-campaigns/${campaignId}/add-tweet`, { tweetLink: newTweetLink.trim() }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setDripCampaigns(prevCampaigns => {
                const updatedCampaigns = prevCampaigns.map(campaign =>
                    campaign._id === campaignId
                        ? { ...campaign, tweets: [...campaign.tweets, newTweetLink.trim()] }
                        : campaign
                );
                
                return updatedCampaigns;
            });

            setAddTweetForm({ campaignId: null, newTweetLink: '', showForm: false, formError: null, formLoading: false });
            showAlertDialog({
                title: "Tweet Added",
                message: response.data.message || "Tweet added successfully!",
                type: "success"
            });
            

        } catch (err) {
            console.error("CreatorDashboard: Error adding tweet to campaign:", err.response?.data || err.message, err);
            let errorMessage = "Failed to add tweet.";
            if (err.response) {
                if (err.response.data && typeof err.response.data === 'object' && err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else {
                    errorMessage = `Server error: ${err.response.status}`;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            setAddTweetForm(prev => ({ ...prev, formError: errorMessage, formLoading: false }));
            showAlertDialog({
                title: "Failed to Add Tweet",
                message: errorMessage,
                type: "error"
            });
        }
    };

    


    if (loadingUser || loadingProfile || loadingDripCampaigns || loadingVolumeBoosts || loadingFomoCampaigns || loadingSparkCampaigns) {
        return (
            <div className="dashboard-loading-overlay">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading your creator dashboard...</p>
            </div>
        );
    }

    if (!user || !user._id || !token) {
        return (
            <div className="dashboard-error-message">
                <p>You are not logged in or your session has expired.</p>
                <button onClick={() => navigate('/login')} className="reload-button">Login Now</button>
            </div>
        );
    }



    if (!hasDashboard) {
        return (
            <div className="dashboard-error-message">
                <p>You do not have a creator dashboard setup yet.</p>
                <button onClick={() => navigate('/create-dashboard')} className="reload-button">Create Dashboard</button>
            </div>
        );
    }

    if (errorProfile) {
        return <div className="dashboard-error-message"><p>{errorProfile}</p></div>;
    }

    if (!profileData) {
        return <div className="dashboard-error-message"><p>Failed to load creator profile. Please try again or create one.</p></div>;
    }



    const totalCampaigns = dripCampaigns.length + volumeBoostCampaigns.length + fomoCampaigns.length + sparkCampaigns.length;
    const totalUsersEngaged = user?.metrics?.totalUsersEngaged || 0; // Example, adjust based on your user object structure
    const totalSpend = user?.metrics?.totalSpend || 0; // Example, adjust based on your user object structure


    
    return (
        <div className="creator-dashboard-container">
            {}
            <div className="creator-profile-header-section glass-card">
                {}
                <div className="banner-section">
                    <div
                        className="banner-image-placeholder"
                        style={{
                            backgroundImage: `url(${profileData.previewBanner})`,
                        }}
                    />
                    {editingProfile && (
                        <>
                            <input
                                id="banner-upload"
                                type="file"
                                name="banner"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="banner-upload-input"
                            />
                            <label htmlFor="banner-upload" className="banner-upload-label-two">
                                <FaCamera className="banner-upload-icon" /> Change Banner
                            </label>
                        </>
                    )}
                </div>
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
                {}
                <div className="profile-info-area">
                    {}
                    <div className="profile-pic-wrapper">
                        <img
                            src={profileData.previewLogo}
                            alt="Logo"
                            className="profile-pic-img"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/100x100/1a1a1a/FF8C00?text=LOGO";
                            }}
                        />
                        {editingProfile && (
                            <>
                                <input
                                    id="logo-upload"
                                    type="file"
                                    name="logo"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="profile-pic-input"
                                />
                                <label htmlFor="logo-upload" className="profile-pic-edit-button">
                                    <FaCamera className="logo-upload-icon" />
                                </label>
                            </>
                        )}
                    </div>

                    {}
                    <div className="profile-details-and-actions-wrapper">
                        {}
                        <div className="profile-details-content">
                            <h2 className="profile-name">{profileData.name || "Project Name"}</h2>
                            <p className="profile-username">@{profileData.username || "username"}</p>
                            <p className="profile-description">{profileData.description || "No description provided."}</p>

                            {}
                            <div className="social-links-container">
                                {profileData.twitter && (
                                    <a href={profileData.twitter} target="_blank" rel="noreferrer" className="social-link twitter">
                                        <FaTwitter className="social-icon" />
                                        <span>Twitter</span>
                                    </a>
                                )}
                                {profileData.website && (
                                    <a href={profileData.website} target="_blank" rel="noreferrer" className="social-link website">
                                        <FaGlobe className="social-icon" />
                                        <span>Website</span>
                                    </a>
                                )}
                                {profileData.discord && (
                                    <a href={profileData.discord} target="_blank" rel="noreferrer" className="social-link discord">
                                        <FaDiscord className="social-icon" />
                                        <span>Discord</span>
                                    </a>
                                )}
                            </div>

                            {}
                            <div className="profile-tags-container">
                                {profileData.tags &&
                                    profileData.tags.split(",").map((tag, i) => (
                                        <span
                                            key={i}
                                            className="profile-tag"
                                        >
                                            #{tag.trim()}
                                        </span>
                                    ))}
                            </div>
                        </div>

                        {}
                        <div className="profile-action-buttons">
                            <button
                                onClick={() => setEditingProfile(!editingProfile)}
                                className="action-button edit-profile-button"
                            >
                                <FaEdit /> {editingProfile ? "Cancel Edit" : "Edit Profile"}
                            </button>

                            {}
                            <div className="create-campaign-dropdown" ref={createCampaignDropdownRef}>
                                <button
                                    onClick={() => setShowCreateCampaignDropdown(prev => !prev)}
                                    className="action-button create-campaign-button"
                                >
                                    <FaPlusCircle /> Create Campaign
                                </button>
                                {showCreateCampaignDropdown && (
                                    <div className={`dropdown-content ${showCreateCampaignDropdown ? 'active' : ''}`}>
                                        <Link
                                            to="/create-spark-campaign" // ⭐ NEW LINK FOR SPARK CAMPAIGN ⭐
                                            className="dropdown-item"
                                            onClick={() => setShowCreateCampaignDropdown(false)}
                                        >
                                            Spark Campaign
                                        </Link>
                                        <Link
                                            to="/create-fire-drip" // This was your original "Fire Drip"
                                            className="dropdown-item"
                                            onClick={() => setShowCreateCampaignDropdown(false)}
                                        >
                                            Drip
                                        </Link>
                                        <Link
                                            to="/create-campaign"
                                            className="dropdown-item disabled-link" // <--- Add the new class here
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent navigation even if somehow clicked
                                                setShowCreateCampaignDropdown(false);
                                            }}
                                        >
                                            FOMO Campaign
                                        </Link>
                                        <Link
                                            to="/inject-fomo"
                                            className="dropdown-item disabled-link" // <--- Add the new class here
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent navigation even if somehow clicked
                                                setShowCreateCampaignDropdown(false);
                                            }}
                                        >
                                            Boost Volume
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div> {}
                </div> {}
            </div> {}

<div className="main-content-area">
    {}
    {editingProfile && (
        <form onSubmit={handleSubmitProfile} className="edit-profile-form glass-card">
            <h3 className="form-section-heading">Update Profile Information</h3>
            <div className="form-group">
                <label htmlFor="name-input">Project Name</label>
                <input id="name-input" name="name" placeholder="Project Name" value={profileData.name} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
                <label htmlFor="username-input">Username</label>
                <input id="username-input" name="username" placeholder="Username" value={profileData.username} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
                <label htmlFor="description-textarea">Project Description</label>
                <textarea id="description-textarea" name="description" placeholder="A brief description of your project..." value={profileData.description} onChange={handleChange} rows={4} className="form-textarea" />
            </div>
            <div className="form-group">
                <label htmlFor="tags-input">Tags (comma-separated)</label>
                <input id="tags-input" name="tags" placeholder="e.g., defi, nft, gamefi, web3" value={profileData.tags} onChange={handleChange} className="form-input" />
            </div>
            <h4 className="form-subsection-heading">Social Links</h4>
            <div className="form-grid-socials">
                <div className="form-group">
                    <label htmlFor="twitter-input"><FaTwitter /> Twitter URL</label>
                    <input id="twitter-input" name="twitter" placeholder="https://twitter.com/yourproject" value={profileData.twitter} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="website-input"><FaGlobe /> Website URL</label>
                    <input id="website-input" name="website" placeholder="https://yourproject.com" value={profileData.website} onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                    <label htmlFor="discord-input"><FaDiscord /> Discord URL</label>
                    <input id="discord-input" name="discord" placeholder="https://discord.gg/yourinvite" value={profileData.discord} onChange={handleChange} className="form-input" />
                </div>
            </div>
            <button type="submit" className="action-button save-changes-button">
                <FaCheckCircle /> Save Changes
            </button>
        </form>
    )}

    {}
    <div className="campaign-sections-title glass-card">
        <h2>Your Campaigns Overview</h2>
        <p>Manage and monitor the performance of your active and past campaigns.</p>
    </div>

    {}
    <div className="campaign-section glass-card">
        <h3 className="section-title"><FaBullhorn className="section-icon" /> Your Spark Campaigns (Telegram)</h3>
        {errorSparkCampaigns && <div className="error-message">{errorSparkCampaigns}</div>}

        {loadingSparkCampaigns ? (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading Spark campaigns...</p>
            </div>
        ) : sparkCampaigns.length === 0 ? (
            <p className="no-campaigns-message">
                You don't have any active Spark Campaigns yet.
                <Link to="/create-spark-campaign" className="create-campaign-link"> Start a Spark Campaign now!</Link>
            </p>
        ) : (
            <div className="campaigns-grid">
                {sparkCampaigns.map(campaign => (
                                <div key={campaign._id} className="campaign-card">
                                    <h4 className="campaign-title">
                                        {campaign.name}
                                        <span className={`campaign-status-tag status-${campaign.status?.toLowerCase()}`}>
                                            {campaign.status === 'active' && <FaCheckCircle className="status-icon" />}
                                            {campaign.status === 'completed' && <FaCheckCircle className="status-icon" />}
                                            {campaign.status === 'pending' && <FaHourglassHalf className="status-icon" />}
                                            {campaign.status?.toUpperCase()}
                                        </span>
                                    </h4>
                                    <div className="campaign-details-list">
                                        <p className="campaign-detail">
                                            Campaign ID:{" "}
                                            <span
                                                className="highlight-value copy-id-wrapper"
                                                onClick={() => handleCopyToClipboard(campaign._id, campaign._id)} // Pass ID twice for toast message
                                                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                                title={copiedCampaignId === campaign._id ? "Copied!" : "Click to copy ID"}
                                            >
                                                {campaign._id}
                                                {copiedCampaignId === campaign._id ? (
                                                    <FaCheckCircle style={{ color: 'green' }} /> // Show checkmark when copied
                                                ) : (
                                                    <FaClipboard className="copy-icon" /> // Show clipboard icon normally
                                                )}
                                            </span>
                                        </p>
                                        {campaign.telegramGroupLink && (
                                            <p className="campaign-detail">
                                                <FaLink className="detail-icon" /> Telegram Group:
                                                <a href={campaign.telegramGroupLink} target="_blank" rel="noopener noreferrer" className="social-link">
                                                    {campaign.telegramGroupLink.replace('https://t.me/', '@')}
                                                </a>
                                            </p>
                                        )}
                                        <p className="campaign-detail">
                                            <FaDollarSign className="detail-icon" /> Budget:
                                            <span className="highlight-value">${campaign.budget?.toFixed(2) || 'N/A'}</span>
                                        </p>
                                        <p className="campaign-detail">
                                            <FaHourglassHalf className="detail-icon" /> Duration:
                                            <span className="highlight-value">{campaign.durationHours} Hours</span>
                                        </p>
                                        <p className="campaign-detail">
                                            <FaChartLine className="detail-icon" /> Messages Tracked:
                                            <span className="highlight-value">{campaign.totalMessagesTracked || 0}</span>
                                        </p>
                                        <p className="campaign-detail">
                                            <FaUsers className="detail-icon" /> Unique Engaged Users:
                                            <span className="highlight-value">{campaign.uniqueUsersEngagedCount || 0}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
            </div>
        )}
    </div>
    {}
    <div className="campaign-section glass-card">
        <h3 className="section-title"><FaTasks className="section-icon" /> Your Drip Campaigns</h3>
        {errorDripCampaigns && <div className="error-message">{errorDripCampaigns}</div>}

        {loadingDripCampaigns ? (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading Drip campaigns...</p>
            </div>
        ) : dripCampaigns.length === 0 ? (
            <p className="no-campaigns-message">
                You don't have any active Drip Campaigns yet.
                <Link to="/create-fire-drip" className="create-campaign-link"> Start a Fire Drip now!</Link>
            </p>
        ) : (
            <div className="campaigns-grid">
                {dripCampaigns.map(campaign => (
                    <div key={campaign._id} className="campaign-card">
                        <h4 className="campaign-title">
                            {campaign.packageName}
                            <span className={`campaign-status-tag ${campaign.status}`}>
                                {campaign.status === 'active' && <FaCheckCircle className="status-icon" />}
                                {campaign.status === 'completed' && <FaCheckCircle className="status-icon" />}
                                {campaign.status === 'pending' && <FaHourglassHalf className="status-icon" />}
                                {campaign.status.toUpperCase()}
                            </span>
                        </h4>
                        <div className="campaign-details-list">
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Duration: <span className="highlight-value">{campaign.durationHours} Hours</span></p>
                            {campaign.status === 'active' && campaign.end_time && (
                                <p className={`campaign-detail ${formatRemainingTime(campaign.end_time).statusClass}-time`}>
                                    <FaHourglassHalf className="detail-icon" /> Remaining: {formatRemainingTime(campaign.end_time).text}
                                </p>
                            )}
                            {campaign.status !== 'active' && campaign.end_time && (
                                <p className={`campaign-detail completed-time`}>
                                    <FaCheckCircle className="detail-icon" /> Ended: {new Date(campaign.end_time).toLocaleDateString()}
                                </p>
                            )}
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Price: <span className="highlight-value">${campaign.priceUSD} USD</span></p>
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Current Engagement: <span className="highlight-value">{campaign.currentEngagementsCount || 0}</span></p>
                        </div>
                        <div className="campaign-tweets-section">
                            <p className="tweets-heading">Tweets in Drip (<span className="highlight-value">{campaign.tweets.length}</span>):</p>
                            <ul className="campaign-tweets-list">
                                {campaign.tweets.map((tweetLink, index) => (
                                    <li key={index}>
                                        <a href={tweetLink} target="_blank" rel="noopener noreferrer" className="tweet-link">
                                            <FaLink className="tweet-icon" /> {tweetLink.split('/').pop() || tweetLink}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="campaign-card-footer">
                            <button
                                className="action-button add-tweet-button"
                                onClick={() => setAddTweetForm({
                                    campaignId: campaign._id,
                                    newTweetLink: '',
                                    showForm: true,
                                    formError: null,
                                    formLoading: false,
                                })}
                                disabled={campaign.status !== 'active'}
                            >
                                <FaPlusCircle /> Add Tweet
                            </button>
                        </div>
                        {addTweetForm.showForm && addTweetForm.campaignId === campaign._id && (
                            <form onSubmit={handleAddTweetToCampaign} className="add-tweet-form glass-card-nested">
                                <p className="form-label-small">Enter new Tweet URL or Identifier:</p>
                                <input
                                    type="text"
                                    placeholder="e.g., https://twitter.com/user/status/123..."
                                    value={addTweetForm.newTweetLink}
                                    onChange={(e) => setAddTweetForm(prev => ({ ...prev, newTweetLink: e.target.value, formError: null }))}
                                    className="form-input tweet-add-input"
                                    disabled={addTweetForm.formLoading}
                                />
                                {addTweetForm.formError && <p className="form-error"><FaExclamationTriangle className="error-icon" /> {addTweetForm.formError}</p>}
                                <div className="form-actions">
                                    <button type="submit" className="action-button submit-add-tweet" disabled={addTweetForm.formLoading}>
                                        {addTweetForm.formLoading ? 'Adding...' : 'Submit'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddTweetForm({ campaignId: null, newTweetLink: '', showForm: false, formError: null, formLoading: false })}
                                        className="action-button cancel-add-tweet"
                                        disabled={addTweetForm.formLoading}
                                    >
                                        <FaTimesCircle /> Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>

    {}
    <div className="campaign-section glass-card">
        <h3 className="section-title"><FaChartLine className="section-icon" /> Your Volume Boost Campaigns</h3>
        {errorVolumeBoosts && <div className="error-message">{errorVolumeBoosts}</div>}

        {loadingVolumeBoosts ? (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading volume boost campaigns...</p>
            </div>
        ) : volumeBoostCampaigns.length === 0 ? (
            <p className="no-campaigns-message">
                You don't have any active Volume Boost Campaigns yet.
                <Link to="/inject-fomo" className="create-campaign-link"> Start a Volume Boost now!</Link>
            </p>
        ) : (
            <div className="campaigns-grid">
                {volumeBoostCampaigns.map(campaign => (
                    <div key={campaign._id} className="campaign-card">
                        <h4 className="campaign-title">
                            {campaign.campaignName}
                            <span className={`campaign-status-tag ${campaign.status}`}>
                                {campaign.status === 'active' && <FaCheckCircle className="status-icon" />}
                                {campaign.status === 'completed' && <FaCheckCircle className="status-icon" />}
                                {campaign.status === 'pending' && <FaHourglassHalf className="status-icon" />}
                                {campaign.status.toUpperCase()}
                            </span>
                        </h4>
                        <div className="campaign-details-list">
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Target Volume: <span className="highlight-value">{campaign.targetVolume}</span></p>
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Speed: <span className="highlight-value">{campaign.speed}</span></p>
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Est. Cost: <span className="highlight-value">${campaign.estimatedTotalCost ? campaign.estimatedTotalCost.toFixed(2) : 'N/A'}</span></p>
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Current Participants: <span className="highlight-value">{campaign.currentParticipants}</span></p>
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Total Loops: <span className="highlight-value">{campaign.totalCampaignLoops}</span></p>
                        </div>
                        {campaign.tweetLink && (
                            <div className="campaign-tweets-section">
                                <p className="tweets-heading">Associated Tweet:</p>
                                <p><a href={campaign.tweetLink} target="_blank" rel="noopener noreferrer" className="tweet-link"><FaLink className="tweet-icon" /> {campaign.tweetLink.split('/').pop() || campaign.tweetLink}</a></p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>

    {}
    <div className="campaign-section glass-card">
        <h3 className="section-title"><FaBullhorn className="section-icon" /> Your FOMO Campaigns</h3>
        {errorFomoCampaigns && <div className="error-message">{errorFomoCampaigns}</div>}

        {loadingFomoCampaigns ? (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading FOMO campaigns...</p>
            </div>
        ) : fomoCampaigns.length === 0 ? (
            <p className="no-campaigns-message">
                You don't have any active FOMO Campaigns yet.
                <Link to="/create-campaign" className="create-campaign-link"> Start a FOMO Campaign now!</Link>
            </p>
        ) : (
            <div className="campaigns-grid">
                {fomoCampaigns.map(campaign => (
                    <div key={campaign._id} className="campaign-card">
                        <h4 className="campaign-title">
                            {campaign.name}
                            <span className={`campaign-status-tag ${campaign.status}`}>
                                {campaign.status === 'active' && <FaCheckCircle className="status-icon" />}
                                {campaign.status === 'completed' && <FaCheckCircle className="status-icon" />}
                                {campaign.status === 'pending' && <FaHourglassHalf className="status-icon" />}
                                {campaign.status.toUpperCase()}
                            </span>
                        </h4>
                        <div className="campaign-details-list">
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Budget: <span className="highlight-value">${campaign.budget ? campaign.budget.toFixed(2) : 'N/A'}</span></p>
                            <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Target Users: <span className="highlight-value">{campaign.numberOfUsers}</span></p>
                            {campaign.totalEngagementsExpected && <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Expected Engagements: <span className="highlight-value">{campaign.totalEngagementsExpected}</span></p>}
                            {campaign.socials?.twitter && (
                                <p className="campaign-detail"><FaTwitter className="social-icon" /> Twitter: <a href={campaign.socials.twitter} target="_blank" rel="noopener noreferrer" className="social-link">{campaign.socials.twitter}</a></p>
                            )}
                            {campaign.socials?.telegram && (
                                <p className="campaign-detail"><FaLink className="detail-icon" /> Telegram: <a href={campaign.socials.telegram} target="_blank" rel="noopener noreferrer" className="social-link">{campaign.socials.telegram}</a></p>
                            )}
                            {campaign.campaignTasks && campaign.campaignTasks.length > 0 && (
                                <p className="campaign-detail"><FaInfoCircle className="detail-icon" /> Tasks: <span className="highlight-value">{campaign.campaignTasks.length} types</span> (<span className="highlight-value">{campaign.campaignTasks.filter(t => t.links && t.links.length > 0).reduce((acc, t) => acc + t.links.length, 0)}</span> total)</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
</div>
        </div>
    );
};

export default CreatorDashboard;