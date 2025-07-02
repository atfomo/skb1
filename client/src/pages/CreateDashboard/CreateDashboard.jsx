
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaSpinner, FaExclamationCircle } from "react-icons/fa"; // Added icons for better feedback
import './CreateDashboard.css'; // New CSS file for this page
import { useUser } from '../../UserContext'; // Path to your UserContext
import axiosInstance from '../../utils/axiosInstance'; // Import your custom Axios instance

const CreateDashboard = () => {

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

        previewLogo: "https://placehold.co/120x120/1a1a1a/FFFFFF?text=Logo",
        previewBanner: "https://placehold.co/800x280/1a1a1a/FFFFFF?text=Your+Banner",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);


    useEffect(() => {
        if (!loadingUser) {
            if (!user) {


                alert('Please log in to create your Creator Dashboard.');
                navigate('/login'); // Redirect to login page
            }
        }
    }, [user, loadingUser, navigate]); // Dependencies for this effect


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

            const previewUrlKey = `preview${name.charAt(0).toUpperCase() + name.slice(1)}`;


            if (formData[previewUrlKey] && formData[previewUrlKey].startsWith('blob:')) {
                URL.revokeObjectURL(formData[previewUrlKey]);
            }


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



        if (!user || !user._id) {
            const authError = "Authentication error. Please log in to proceed.";
            setSubmitError(authError);
            setIsSubmitting(false);
            return; // Stop the submission process
        }

        const data = new FormData(); // Create a new FormData object for multipart/form-data submission


        Object.keys(formData).forEach((key) => {
            if (key === 'logo' || key === 'banner') {

                if (formData[key] instanceof File) {
                    data.append(key, formData[key]);
                }
            } else if (!key.startsWith('preview') && formData[key] !== null && formData[key] !== undefined) {

                data.append(key, formData[key]);
            }
        });


        data.append("ownerId", user._id);

        try {


            const response = await axiosInstance.post(`/api/project/creator-dashboard`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Essential for FormData
                },
            });




            if (response.status === 200 || response.status === 201) {
                alert("Creator Dashboard created successfully!"); // Consider custom modal

                await refetchUserData();

                navigate(`/creator-dashboard`); // Navigate to specific user dashboard
            } else {



                setSubmitError(response.data.message || `Failed to create dashboard with status: ${response.status}.`);
            }
        } catch (err) {

            if (err.response) {


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


    if (loadingUser) {
        return (
            <div className="create-dashboard-container dashboard-loading-overlay">
                <FaSpinner className="loading-spinner" />
                <p className="loading-text">Loading user data...</p>
            </div>
        );
    }

    if (!user) {

        return (
            <div className="create-dashboard-container dashboard-error-message">
                <FaExclamationCircle className="error-icon" />
                <p className="error-text">You must be logged in to create a dashboard.</p>
                {}
                <button onClick={() => navigate('/login')} className="reload-button">Go to Login</button>
            </div>
        );
    }


    return (
        <div className="create-dashboard-main"> {}
            <div className="glass-card create-dashboard-card"> {}
                <h1 className="create-dashboard-title">Create Your Creator Dashboard</h1>
                <p className="create-dashboard-subtitle">Set up your profile to start creating campaigns and engaging your audience.</p>

                <form onSubmit={handleSubmit} className="create-dashboard-form">
                    {}
                    <div className="image-upload-section">
                        <div className="banner-area">
                            <div className="banner-preview-display" style={{ backgroundImage: `url(${formData.previewBanner})` }}>
                                {}
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

                        {}
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

                    {}
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
                                placeholder="e.g., quantumleap / doge_coin"
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

                    {}
                    <div className="form-section-heading">Social Links (Optional)</div>
                    <div className="form-grid-socials"> {}
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

                    {}
                    {submitError && (
                        <p className="submit-error-message error-message"> {}
                            <FaExclamationCircle className="error-icon" /> {submitError}
                        </p>
                    )}

                    {}
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