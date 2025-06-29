import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../UserContext';
import { useDialog } from '../../context/DialogContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './AddSparkCampaignForm.css';
import {
    FaPaperPlane, FaDollarSign, FaCalendarAlt, FaHashtag, FaExternalLinkAlt,
    FaInfoCircle, FaCheckCircle, FaTimesCircle, FaLink, FaTwitter, FaTelegramPlane, FaLightbulb,
    FaImage // Added FaImage icon for banner upload
} from 'react-icons/fa'; // Added more specific icons

// --- Internal Constants for Estimated Engagement (Define these based on your strategy) ---
const MESSAGE_PAYOUT = 0.01;
const LINK_CLICK_PAYOUT = 0.025;
const REACTION_PAYOUT = 0.025;

const MESSAGE_PORTION = 0.60;
const LINK_CLICK_PORTION = 0.20;
const REACTION_PORTION = 0.20;

const AVERAGE_ACTIONS_PER_USER = 50;

const AddSparkCampaignForm = () => {
    const { user, refetchUserData, loadingUser } = useUser();
    const navigate = useNavigate();
    const { showAlertDialog } = useDialog();

    const [campaignName, setCampaignName] = useState('');
    const [budget, setBudget] = useState('');
    const [durationHours, setDurationHours] = useState(''); // Changed to durationHours
    const [telegramGroupLink, setTelegramGroupLink] = useState('');
    const [tweetUrl, setTweetUrl] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [requiredActions, setRequiredActions] = useState({
        like: true,
        retweet: true,
        comment: true,
        joinTelegram: true,
    });
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    // --- NEW: State for banner image file and its preview URL ---
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');

    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null); // Renamed to avoid confusion with Dialog error
    const [formSuccess, setFormSuccess] = useState(null); // Renamed

    // Effect to create and revoke object URL for banner preview
    useEffect(() => {
        if (bannerFile) {
            const objectUrl = URL.createObjectURL(bannerFile);
            setBannerPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl); // Clean up on unmount or file change
        } else {
            setBannerPreviewUrl(''); // Clear preview if no file selected
        }
    }, [bannerFile]);

    // Use useMemo for estimated engagement
    const estimatedEngagement = useMemo(() => {
        const parsedBudget = parseFloat(budget);
        if (isNaN(parsedBudget) || parsedBudget <= 0) {
            return {
                messages: 0,
                linkClicks: 0,
                reactions: 0,
                participants: 0,
                isValid: false,
            };
        }

        const userRewardPool = parsedBudget * 0.80;

        const estimatedMessages = (userRewardPool * MESSAGE_PORTION) / MESSAGE_PAYOUT;
        const estimatedLinkClicks = (userRewardPool * LINK_CLICK_PORTION) / LINK_CLICK_PAYOUT;
        const estimatedReactions = (userRewardPool * REACTION_PORTION) / REACTION_PAYOUT;

        const totalEstimatedActions = estimatedMessages + estimatedLinkClicks + estimatedReactions;
        const estimatedParticipants = totalEstimatedActions / AVERAGE_ACTIONS_PER_USER;

        return {
            messages: Math.floor(estimatedMessages),
            linkClicks: Math.floor(estimatedLinkClicks),
            reactions: Math.floor(estimatedReactions),
            participants: Math.round(estimatedParticipants),
            isValid: true,
        };
    }, [budget]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        setFormSuccess(null);

        if (!user || !user._id) {
            const msg = "User not logged in or ID not available. Please log in.";
            setFormError(msg);
            showAlertDialog("Authentication Error", msg);
            setLoading(false);
            return;
        }

        // Basic validation
        if (!campaignName.trim() || !budget || !durationHours || !telegramGroupLink.trim() || !tweetUrl.trim()) {
            const msg = "Please fill in all required fields (Campaign Name, Budget, Duration, Telegram Link, X (Twitter) URL).";
            setFormError(msg);
            showAlertDialog("Validation Error", msg);
            setLoading(false);
            return;
        }
        if (isNaN(parseFloat(budget)) || parseFloat(budget) <= 0) {
            const msg = "Budget must be a positive number.";
            setFormError(msg);
            showAlertDialog("Validation Error", msg);
            setLoading(false);
            return;
        }
        if (isNaN(parseInt(durationHours)) || parseInt(durationHours) <= 0) {
            const msg = "Duration must be a positive integer.";
            setFormError(msg);
            showAlertDialog("Validation Error", msg);
            setLoading(false);
            return;
        }
        // --- NEW: Banner File Validation ---
        if (!bannerFile) {
            const msg = "Please upload a campaign banner image.";
            setFormError(msg);
            showAlertDialog("Validation Error", msg);
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('jwtToken');
        if (!token) {
            const msg = "Authentication token not found. Please log in.";
            setFormError(msg);
            showAlertDialog("Authentication Error", msg);
            setLoading(false);
            navigate('/login');
            return;
        }

        // --- Prepare FormData for file upload ---
        // FormData is used to send files and other form data in a single request
        const formData = new FormData();
        formData.append('creatorId', user._id);
        formData.append('name', campaignName.trim());
        formData.append('budget', parseFloat(budget));
        formData.append('durationHours', parseInt(durationHours));
        formData.append('telegramGroupLink', telegramGroupLink.trim());
        formData.append('tweetUrl', tweetUrl.trim());
        // For array and object states, stringify them before appending to FormData
        formData.append('hashtags', JSON.stringify(hashtags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')));
        formData.append('requiredActions', JSON.stringify(requiredActions));
        formData.append('additionalInstructions', additionalInstructions.trim());
        formData.append('campaignType', 'spark');
        formData.append('bannerImage', bannerFile); // Append the actual file here, backend will receive it as 'bannerImage'

        try {
            // Axios will automatically set Content-Type to multipart/form-data when sending FormData
            const response = await axios.post(`${API_BASE_URL}/api/spark-campaigns`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                    // No need to set 'Content-Type' manually; Axios handles it for FormData
                }
            });

            if (response.status === 201) {
                setFormSuccess("Spark Campaign created successfully!");
                showAlertDialog(
                    "Campaign Created!",
                    `Your campaign "${campaignName}" has been successfully launched! You can view its status on your dashboard.`,
                    () => navigate('/creator-dashboard')
                );
                // Clear form fields
                setCampaignName('');
                setBudget('');
                setDurationHours('');
                setTelegramGroupLink('');
                setTweetUrl('');
                setHashtags('');
                setRequiredActions({
                    like: true, retweet: true, comment: true, joinTelegram: true,
                });
                setAdditionalInstructions('');
                setBannerFile(null); // Clear selected file
                setBannerPreviewUrl(''); // Clear preview URL
                refetchUserData(); // Refresh user data, assuming campaign creation updates user's campaigns
            } else {
                const msg = response.data.message || "Failed to create campaign. Please check your inputs.";
                setFormError(msg);
                showAlertDialog("Campaign Creation Failed", msg);
            }
        } catch (err) {
            console.error("Error creating Spark Campaign:", err.response?.data || err.message);
            const msg = err.response?.data?.message || err.message || "An unexpected error occurred while creating the campaign.";
            setFormError(msg);
            showAlertDialog("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    if (loadingUser) {
        return (
            <div className="spark-campaign-form-loading">
                <div className="loading-spinner"></div>
                <p>Loading user data...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="spark-campaign-form-access-denied">
                <h2>Access Denied</h2>
                <p>Please log in to create a Spark Campaign.</p>
                <button onClick={() => navigate('/login')} className="form-button primary-button">Go to Login</button>
            </div>
        );
    }

    return (
        <div className="add-spark-campaign-container glass-card">
            <h2 className="form-title"><FaPaperPlane className="form-icon" /> Create New Spark Campaign</h2>
            <p className="form-description">Launch a Telegram-driven campaign to boost engagement for your X (Twitter) content.</p>

            {formError && (
                <div className="alert error-alert">
                    <FaTimesCircle className="alert-icon" /> {formError}
                </div>
            )}
            {formSuccess && (
                <div className="alert success-alert">
                    <FaCheckCircle className="alert-icon" /> {formSuccess}
                </div>
            )}

            <form onSubmit={handleSubmit} className="spark-campaign-form">
                {/* Section 1: Basic Campaign Info */}
                <div className="form-section">
                    <h3><FaLightbulb className="section-icon" /> Campaign Basics</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="campaignName">Campaign Name:</label>
                            <input
                                type="text"
                                id="campaignName"
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                                placeholder="e.g., My Project Launch Boost"
                                required
                                className="form-input"
                            />
                        </div>

                        {/* --- NEW: Banner Upload Field --- */}
                        <div className="form-group full-width">
                            <label htmlFor="bannerImage">Campaign Banner Image:</label>
                            <input
                                type="file"
                                id="bannerImage"
                                accept="image/*" // Restrict to image files
                                onChange={(e) => setBannerFile(e.target.files[0])} // Get the first file selected
                                required
                                className="form-input-file" // Custom class for styling
                            />
                            <p className="input-hint"><FaImage /> For optimal display, please upload a JPG or PNG image (max 2MB). We recommend dimensions of 360x280px.</p>
                            {bannerPreviewUrl && (
                                <div className="banner-preview">
                                    <p>Image Preview:</p>
                                    <img src={bannerPreviewUrl} alt="Banner Preview" className="uploaded-banner-preview" />
                                </div>
                            )}
                        </div>
                        {/* --- END NEW: Banner Upload Field --- */}

                        <div className="form-group">
                            <label htmlFor="budget">Total Campaign Budget (USD):</label>
                            <input
                                type="number"
                                id="budget"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="e.g., 500"
                                min="1"
                                step="1"
                                required
                                className="form-input"
                            />
                            <p className="input-hint">
                                <FaInfoCircle /> Set your total campaign budget. Minimum $1.
                            </p>
                            {estimatedEngagement.isValid && parseFloat(budget) > 0 && (
                                <div className="estimated-engagement-box">
                                    <h4>Your Budget Estimates:</h4>
                                    <ul>
                                        <li>
                                            <FaCheckCircle className="icon-small" /> Approx.{" "}
                                            <strong>{estimatedEngagement.messages.toLocaleString()}</strong> valid chat messages.
                                        </li>
                                        <li>
                                            <FaCheckCircle className="icon-small" /> Approx.{" "}
                                            <strong>{estimatedEngagement.linkClicks.toLocaleString()}</strong> link clicks.
                                        </li>
                                        <li>
                                            <FaCheckCircle className="icon-small" /> Approx.{" "}
                                            <strong>{estimatedEngagement.reactions.toLocaleString()}</strong> reactions.
                                        </li>
                                        {estimatedEngagement.participants > 0 && (
                                            <li>
                                                <FaCheckCircle className="icon-small" /> Engaging{" "}
                                                <strong>{estimatedEngagement.participants.toLocaleString()}</strong> unique users.
                                            </li>
                                        )}
                                    </ul>
                                    <p className="note">
                                        <FaInfoCircle /> These are estimates. Unspent budget is refunded.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="durationHours">Duration (Hours):</label>
                            <input
                                type="number"
                                id="durationHours"
                                value={durationHours}
                                onChange={(e) => setDurationHours(e.target.value)}
                                placeholder="e.g., 24"
                                min="1"
                                required
                                className="form-input"
                            />
                            <p className="input-hint"><FaInfoCircle /> Campaign duration (e.g., 12, 24, 48 hours).</p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Engagement Details */}
                <div className="form-section">
                    <h3><FaExternalLinkAlt className="section-icon" /> Engagement Details</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="telegramGroupLink">Telegram Group Link:</label>
                            <input
                                type="url"
                                id="telegramGroupLink"
                                value={telegramGroupLink}
                                onChange={(e) => setTelegramGroupLink(e.target.value)}
                                placeholder="e.g., https://t.me/your_project_group_invite"
                                required
                                className="form-input"
                            />
                            <p className="input-hint"><FaTelegramPlane /> Invite link. @AtfomoBot must be admin with all permissions.</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="tweetUrl">X (Twitter) Tweet URL:</label>
                            <input
                                type="url"
                                id="tweetUrl"
                                value={tweetUrl}
                                onChange={(e) => setTweetUrl(e.target.value)}
                                placeholder="e.g., https://x.com/your_handle/status/1234567890"
                                required
                                className="form-input"
                            />
                            <p className="input-hint"><FaTwitter /> Direct link to the tweet for engagement.</p>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="hashtags">Hashtags (comma-separated):</label>
                            <input
                                type="text"
                                id="hashtags"
                                value={hashtags}
                                onChange={(e) => setHashtags(e.target.value)}
                                placeholder="e.g., #Web3, #Crypto, #YourProject"
                                className="form-input"
                            />
                            <p className="input-hint"><FaHashtag /> Optional: Hashtags for comments or posts.</p>
                        </div>
                    </div>
                </div>

                {/* Section 3: Required Actions & Instructions */}
                <div className="form-section">
                    <h3><FaCheckCircle className="section-icon" /> Additional Actions</h3>
                    <div className="checkbox-grid">
                        <label className="custom-checkbox-label">
                            <input
                                type="checkbox"
                                name="like"
                                checked={requiredActions.like}
                                onChange={(e) => setRequiredActions({ ...requiredActions, like: e.target.checked })}
                                className="checkbox-input"
                            />
                            <span className="checkbox-custom"></span>
                            Like X Post
                        </label>
                        <label className="custom-checkbox-label">
                            <input
                                type="checkbox"
                                name="retweet"
                                checked={requiredActions.retweet}
                                onChange={(e) => setRequiredActions({ ...requiredActions, retweet: e.target.checked })}
                                className="checkbox-input"
                            />
                            <span className="checkbox-custom"></span>
                            Retweet X Post
                        </label>
                        <label className="custom-checkbox-label">
                            <input
                                type="checkbox"
                                name="comment"
                                checked={requiredActions.comment}
                                onChange={(e) => setRequiredActions({ ...requiredActions, comment: e.target.checked })}
                                className="checkbox-input"
                            />
                            <span className="checkbox-custom"></span>
                            Comment on X Post
                        </label>
                        <label className="custom-checkbox-label">
                            <input
                                type="checkbox"
                                name="joinTelegram"
                                checked={requiredActions.joinTelegram}
                                onChange={(e) => setRequiredActions({ ...requiredActions, joinTelegram: e.target.checked })}
                                className="checkbox-input"
                            />
                            <span className="checkbox-custom"></span>
                            Join Telegram Group
                        </label>
                    </div>
                </div>

                <div className="form-section">
                    <h3><FaInfoCircle className="section-icon" /> Additional Instructions</h3>
                    <div className="form-group full-width">
                        <label htmlFor="additionalInstructions">Provide any specific guidelines:</label>
                        <textarea
                            id="additionalInstructions"
                            value={additionalInstructions}
                            onChange={(e) => setAdditionalInstructions(e.target.value)}
                            placeholder="e.g., Mention specific points in comments, stay active in the group. Limit to 500 characters."
                            rows="4"
                            className="form-textarea"
                            maxLength="500"
                        ></textarea>
                        <p className="input-hint">Any extra guidelines for Users.</p>
                    </div>
                </div>

                <button type="submit" className="form-button primary-button" disabled={loading}>
                    {loading ? 'Creating Campaign...' : <><FaPaperPlane /> Create Campaign</>}
                </button>
            </form>
        </div>
    );
};

export default AddSparkCampaignForm;