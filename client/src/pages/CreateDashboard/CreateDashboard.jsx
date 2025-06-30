// client/src/pages/CreateDashboard/CreateDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaSpinner, FaExclamationCircle } from "react-icons/fa"; // Added icons for better feedback
import './CreateDashboard.css'; // New CSS file for this page
import { useUser } from '../../UserContext'; // Path to your UserContext
import axiosInstance from '../../utils/axiosInstance'; // Import your custom Axios instance

const CreateDashboard = () => {
    // Correctly deconstruct refetchUserData from useUser hook
    const { user, token, loadingUser, refetchUserData } = useUser();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        description: '',
        tags: '',
        twitter: '',
        website: '',
        discord: '',
        logo: null,
        banner: null,
        // Default placeholder images for preview - matched to dark theme
        previewLogo: "https://placehold.co/120x120/1a1a1a/FFFFFF?text=Logo",
        previewBanner: "https://placehold.co/800x280/1a1a1a/FFFFFF?text=Your+Banner",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // --- Authentication and Redirection Check ---
    useEffect(() => {
        if (!loadingUser) {
            if (!user) {
                // Using an alert is fine for critical user actions, but for a "billion dollar website",
                // consider a custom modal or inline message instead of native alert.
                alert('Please log in to create your Creator Dashboard.');
                navigate('/login'); // Redirect to login page
            }
        }
    }, [user, loadingUser, navigate]); // Dependencies for this effect

    // Cleanup for preview URLs (blob URLs) when component unmounts or formData changes
    useEffect(() => {
        const currentFormData = formData;
        return () => {
            if (currentFormData.previewLogo && currentFormData.previewLogo.startsWith('blob:')) {
                URL.revokeObjectURL(currentFormData.previewLogo);
            }
            if (currentFormData.previewBanner && currentFormData.previewBanner.startsWith('blob:')) {
                URL.revokeObjectURL(currentFormData.previewBanner);
            }
        };
    }, [formData]); // Run cleanup when formData changes

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const file = files[0];
            // Determine the corresponding preview URL key (e.g., 'logo' -> 'previewLogo')
            const previewUrlKey = `preview${name.charAt(0).toUpperCase() + name.slice(1)}`;

            // Revoke previous blob URL to prevent memory leaks if a new file is selected
            if (formData[previewUrlKey] && formData[previewUrlKey].startsWith('blob:')) {
                URL.revokeObjectURL(formData[previewUrlKey]);
            }

            // Update form data with the file and its new preview URL
            setFormData((prev) => ({
                ...prev,
                [name]: file,
                [previewUrlKey]: URL.createObjectURL(file), // Create a new blob URL for preview
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        setSubmitError(null); // Clear any previous errors
        setIsSubmitting(true); // Set submitting state to true

        // --- AUTHENTICATION CHECK ---
        // Ensure user is logged in and has a user ID. Token check is implicitly handled by axiosInstance.
        if (!user || !user._id) {
            const authError = "Authentication error. Please log in to proceed.";
            setSubmitError(authError);
            setIsSubmitting(false);
            return; // Stop the submission process
        }

        const data = new FormData(); // Create a new FormData object for multipart/form-data submission

        // --- FORM DATA APPENDING ---
        Object.keys(formData).forEach((key) => {
            if (key === 'logo' || key === 'banner') {
                // Append File objects directly
                if (formData[key] instanceof File) {
                    data.append(key, formData[key]);
                }
            } else if (!key.startsWith('preview') && formData[key] !== null && formData[key] !== undefined) {
                // Append text fields, excluding preview URLs and null/undefined values
                data.append(key, formData[key]);
            }
        });

        // Append the ownerId from the authenticated user's ID
        data.append("ownerId", user._id);

        try {
            // Use axiosInstance instead of global axios.
            // The Authorization header is now handled by the axiosInstance's request interceptor.
            const response = await axiosInstance.post(`/api/project/creator-dashboard`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Essential for FormData
                },
            });

            // Axios typically throws an error for non-2xx status codes,
            // so this check might be redundant if the interceptor handles 401/403.
            // However, for other success codes (like 200, 201), this remains valid.
            if (response.status === 200 || response.status === 201) {
                alert("Creator Dashboard created successfully!"); // Consider custom modal
                // Re-fetch user data to update hasDashboard status in context
                await refetchUserData();
                // Navigate to the dashboard view page after successful creation
                navigate(`/creator-dashboard`); // Navigate to specific user dashboard
            } else {
                // This 'else' block will now only be hit for actual errors (e.g., 400, 401, 403, 500)
                // If axiosInstance's response interceptor handles 401/403 by logging out,
                // this block will typically handle other non-2xx statuses that aren't 401/403.
                setSubmitError(response.data.message || `Failed to create dashboard with status: ${response.status}.`);
            }
        } catch (err) {
            // Enhanced error handling for different Axios error types
            if (err.response) {
                // The interceptor might have already handled 401/403 and logged out.
                // This branch would catch other server errors like 400, 500.
                setSubmitError(err.response.data.message || `Server error (Status: ${err.response.status})`);
            } else if (err.request) {
                setSubmitError("No response from server. Is the backend running? Check network connection.");
            } else {
                setSubmitError(`An unexpected error occurred: ${err.message}`);
            }
        } finally {
            setIsSubmitting(false); // Reset submitting state
        }
    };

    // --- Page-level Loading and Authentication Required States ---
    if (loadingUser) {
        return (
            <div className="create-dashboard-container dashboard-loading-overlay">
                <FaSpinner className="loading-spinner" />
                <p className="loading-text">Loading user data...</p>
            </div>
        );
    }

    if (!user) {
        // This message is shown before the useEffect navigates, for immediate feedback
        return (
            <div className="create-dashboard-container dashboard-error-message">
                <FaExclamationCircle className="error-icon" />
                <p className="error-text">You must be logged in to create a dashboard.</p>
                {/* You might want a button here to navigate to login if not already handled by useEffect */}
                <button onClick={() => navigate('/login')} className="reload-button">Go to Login</button>
            </div>
        );
    }

    // Main component render
    return (
        <div className="create-dashboard-main"> {/* Renamed container for proper centering/layout */}
            <div className="glass-card create-dashboard-card"> {/* Applying glass-card style */}
                <h1 className="create-dashboard-title">Create Your Creator Dashboard</h1>
                <p className="create-dashboard-subtitle">Set up your profile to start creating campaigns and engaging your audience.</p>

                <form onSubmit={handleSubmit} className="create-dashboard-form">
                    {/* Banner and Logo Section - mimicking CreatorDashboard's header structure */}
                    <div className="image-upload-section">
                        <div className="banner-area">
                            <div className="banner-preview-display" style={{ backgroundImage: `url(${formData.previewBanner})` }}>
                                {/* Label for banner upload, positioned over the preview */}
                                <label htmlFor="banner-upload" className="banner-upload-label">
                                    <FaCamera className="upload-icon" /> Change Banner
                                </label>
                            </div>
                            <input
                                id="banner-upload"
                                type="file"
                                name="banner"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="file-input"
                            />
                        </div>

                        {/* Logo Upload Section - positioned to overlap the banner */}
                        <div className="logo-area">
                            <label htmlFor="logo-upload" className="logo-upload-label">
                                <img
                                    src={formData.previewLogo}
                                    alt="Logo Preview"
                                    className="logo-preview-img"
                                />
                                <div className="logo-upload-overlay">
                                    <FaCamera className="upload-icon" />
                                    <span>Upload Logo</span>
                                </div>
                            </label>
                            <input
                                id="logo-upload"
                                type="file"
                                name="logo"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="file-input"
                            />
                        </div>
                    </div>

                    {/* Basic Info Section */}
                    <div className="form-section-heading">Basic Information</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="name">Project/Brand Name:</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., QuantumLeap Studios"
                                required
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="username">Unique Username:</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="e.g., quantumleap (for your dashboard URL)"
                                required
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description (max 500 characters):</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="A brief description of your project or brand."
                            rows="4"
                            maxLength="500"
                            className="form-textarea" // Use form-textarea for consistency
                        ></textarea>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tags">Tags (comma-separated):</label>
                        <input
                            id="tags"
                            name="tags"
                            type="text"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="e.g., crypto, defi, nft, gaming"
                            className="form-input" // Use form-input for consistency
                        />
                    </div>

                    {/* Social Links Section */}
                    <div className="form-section-heading">Social Links (Optional)</div>
                    <div className="form-grid-socials"> {/* Reusing form-grid-socials from CreatorDashboard */}
                        <div className="form-group">
                            <label htmlFor="twitter">Twitter URL:</label>
                            <input
                                id="twitter"
                                name="twitter"
                                type="url"
                                value={formData.twitter}
                                onChange={handleChange}
                                placeholder="https://x.com/yourprofile"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="website">Website URL:</label>
                            <input
                                id="website"
                                name="website"
                                type="url"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="https://yourwebsite.com"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="discord">Discord Invite URL:</label>
                            <input
                                id="discord"
                                name="discord"
                                type="url"
                                value={formData.discord}
                                onChange={handleChange}
                                placeholder="https://discord.gg/yourinvite"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Submission Error Display */}
                    {submitError && (
                        <p className="submit-error-message error-message"> {/* Using existing error-message class */}
                            <FaExclamationCircle className="error-icon" /> {submitError}
                        </p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="save-changes-button" // Reusing the save button style
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <FaSpinner className="spin-icon" /> Creating Dashboard...
                            </>
                        ) : (
                            "Create Dashboard"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateDashboard;