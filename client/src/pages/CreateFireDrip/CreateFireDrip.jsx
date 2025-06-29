// client/src/pages/CreateFireDrip/CreateFireDrip.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../UserContext'; // Ensure this path is correct
import './CreateFireDrip.css'; // For styling
import { API_BASE_URL } from '../../config';

// const API_BASE_URL = "http://localhost:5000";

// Updated Drip Packages to match backend
const DRIP_PACKAGES = [
    { id: 'ignition', name: 'Ignition Drip', durationHours: 12, priceUSD: 1199 },
    { id: 'boost', name: 'Boost Drip', durationHours: 24, priceUSD: 1999 },
    { id: 'surge', name: 'Surge Drip', durationHours: 48, priceUSD: 3499 },
    // Removed Velocity and Apex as they are not in the new plans
];

const CreateFireDrip = () => {
    const { user, token, loadingUser } = useUser();
    const navigate = useNavigate();

    const [selectedPackage, setSelectedPackage] = useState(null);
    const [initialTweetLink, setInitialTweetLink] = useState(''); // Only for the initial tweet
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (!loadingUser && (!user || !user._id || !token)) {
            navigate('/login'); // Redirect to login if not authenticated
        }
    }, [user, token, loadingUser, navigate]);

    // Helper function to check if a string is a valid Twitter tweet link
    const isValidTweetLink = (link) => {
        const twitterRegex = /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+(\/)?(\?.*)?$/;
        return twitterRegex.test(link);
    };

    const handlePackageSelect = (packageId) => {
        const pkg = DRIP_PACKAGES.find(p => p.id === packageId);
        setSelectedPackage(pkg);
        setInitialTweetLink(''); // Clear initial tweet link when package changes
        setMessage(null);
        setError(null);
    };

    const handleCreateDripCampaign = async () => {
        if (!user || !user._id || !token) {
            setError("Authentication error. Please log in again.");
            navigate('/login');
            return;
        }
        if (!selectedPackage) {
            setError("Please select a Drip Package.");
            return;
        }
        if (!initialTweetLink.trim()) {
            setError("Please add your initial tweet link to start the drip.");
            return;
        }
        if (!isValidTweetLink(initialTweetLink)) {
            setError("Please enter a valid Twitter (X) tweet URL for the initial tweet.");
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/drip-campaigns/create-drip`, {
                creatorId: user._id,
                packageId: selectedPackage.id,
                // Send only the single initial tweet link
                initialTweetLink: initialTweetLink.trim(),
                priceUSD: selectedPackage.priceUSD, // Sending price for backend validation/logging
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setMessage(response.data.message || "Drip campaign created successfully!");
            setInitialTweetLink(''); // Clear input after successful creation
            setSelectedPackage(null); // Reset selected package
            // Optionally redirect to a dashboard where they can see their active drip
            // and add more tweets. You'll need to create this dashboard page.
            navigate(`/creator-dashboard`);

        } catch (err) {
            console.error("Error creating Drip campaign:", err.response?.data || err.message);
            setError(err.response?.data?.message || "Failed to create drip campaign.");
        } finally {
            setLoading(false);
        }
    };

    if (loadingUser) {
        return <div className="loading-message">Loading user data...</div>;
    }

        return (
        <div className="fire-drip-container">
            <h2>Create Drip Campaign</h2>
            <p className="description">
                Boost your tweets with instant likes, retweets, and comments. Select a package, add your initial tweet link, and activate your campaign. You can add more tweets to an active drip from your dashboard.
            </p>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <div className="drip-packages">
                <h3>1. Choose Your Drip Package</h3>
                <div className="package-list">
                    {DRIP_PACKAGES.map(pkg => (
                        <div
                            key={pkg.id}
                            className={`package-card ${selectedPackage?.id === pkg.id ? 'selected' : ''}`}
                            onClick={() => handlePackageSelect(pkg.id)}
                        >
                            <h4>{pkg.name}</h4>
                            <p>Duration: {pkg.durationHours} Hours</p>
                            <p className="price">${pkg.priceUSD} USD</p>
                            <p className="package-description">{pkg.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {selectedPackage && (
                <div className="selected-package-details">
                    <h3>Selected: {selectedPackage.name} - ${selectedPackage.priceUSD} USD ({selectedPackage.durationHours} Hours)</h3>
                    <p>This package will facilitate a significant number of engagements for your tweets within the selected duration.</p>
                    <p className="payout-note">
                        Earner payout rates are managed internally and may vary.
                    </p>
                </div>
            )}

            {selectedPackage && (
                <div className="tweet-links-section">
                    <h3>2. Start Your Drip with a Tweet</h3>
                    <p>Enter the URL of the first tweet you want to boost. You can add more tweets to this drip later from your creator dashboard.</p>
                    <div className="initial-tweet-input">
                        <input
                            type="text"
                            placeholder="Paste your initial Tweet (X) URL here (e.g., https://x.com/username/status/123456789)"
                            value={initialTweetLink}
                            onChange={(e) => {
                                setInitialTweetLink(e.target.value);
                                setError(null); // Clear error on input change
                            }}
                            className="tweet-input"
                        />
                    </div>
                </div>
            )}

            {/* THIS IS THE "ACTIVATE DRIP CAMPAIGN" BUTTON */}
            {selectedPackage && initialTweetLink.trim() && isValidTweetLink(initialTweetLink) && (
                <div className="create-campaign-actions">
                    <button
                        onClick={handleCreateDripCampaign}
                        className="submit-drip-button"
                        disabled={loading} // This disables the button while the API request is in progress
                    >
                        {loading ? 'Activating Drip...' : 'Activate Drip Campaign'}
                    </button>
                </div>
            )}
        </div>
    );
};


export default CreateFireDrip;