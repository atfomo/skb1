// client/src/views/Dashboard/Dashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../../UserContext";
import { useDialog } from '../../context/DialogContext';
import './Dashboard.css';
import RulesModal from '../../components/RulesModal';
// import TelegramLoginButton from '../../components/TelegramLoginButton'; // REMOVE THIS IMPORT

// --- Icon Imports ---
import { FaTwitter, FaTelegramPlane } from 'react-icons/fa';
import {
    IoWalletOutline,
    IoCashOutline,
    IoPersonCircleOutline,
    IoSaveOutline,
    IoInformationCircleOutline,
    IoHammerOutline,
    IoReloadOutline,
    IoArrowForwardOutline,
    IoCheckmarkCircle,
    IoCloseCircle,
    IoClose,
    IoWarningOutline,
    IoLinkOutline
} from 'react-icons/io5';
import { API_BASE_URL } from '../../config'; // <-- Ensure this is correctly imported

const Dashboard = () => {
    const { user, token, refetchUserData, loadingUser } = useUser();
    const { showAlertDialog, showConfirmDialog } = useDialog();
    const [localWalletAddress, setLocalWalletAddress] = useState("");
    const [localXUsername, setLocalXUsername] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [showPayout, setShowPayout] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState("");
    const [showRulesModal, setShowRulesModal] = useState(false);
    
    // NEW STATE: For the Telegram username input
    const [telegramUsernameInput, setTelegramUsernameInput] = useState("");
    const [isVerifyingTelegram, setIsVerifyingTelegram] = useState(false); // New state for verification loading

    useEffect(() => {
        console.log("Dashboard: Component re-rendered.");
        console.log("Dashboard: user object from UserContext:", user);
        console.log("Dashboard: loadingUser from UserContext:", loadingUser);
        if (user) {
            console.log("Dashboard: user.telegramUserId:", user.telegramUserId);
            console.log("Dashboard: user.telegramUsername:", user.telegramUsername);
            // console.log("Dashboard: isTelegramLinking state:", isTelegramLinking); // REMOVE THIS LOG
        } else {
            console.log("Dashboard: User object is null. Displaying loading or login message.");
        }
    }, [user, loadingUser]); // Removed isTelegramLinking from dependency array

    useEffect(() => {
        if (user) {
            setLocalWalletAddress(user.walletAddress || "");
            setLocalXUsername(user.xUsername || "");
            // Initialize Telegram username input with user's linked username if available
            setTelegramUsernameInput(user.telegramUsername || ""); 
        }
    }, [user]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // REMOVED: The handleTelegramAuth CALLBACK is no longer needed for this flow
    // const handleTelegramAuth = useCallback(async (telegramUser) => { ... });

    // NEW FUNCTION: Handle the Telegram username submission and redirection
    const handleTelegramVerify = async () => {
        const username = telegramUsernameInput.trim();
        if (!username) {
            showAlertDialog("Error", "Please enter your Telegram username.");
            return;
        }

        // Remove the '@' if the user entered it
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;

        setIsVerifyingTelegram(true);
        try {
            // STEP 1: Send the username to your backend to generate a verification token
            const response = await fetch(`${API_BASE_URL}/api/telegram/initiate-verification`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ telegramUsername: cleanUsername }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to initiate Telegram verification.");
            }

            const { verificationCode, botUsername } = data;
            // Removed: const encodedUsername = encodeURIComponent(cleanUsername); // No longer strictly needed for this link format

            // STEP 2: Redirect the user to the Telegram bot with the verification code
            const telegramBotLink = `https://t.me/${botUsername}?start=verify_${verificationCode}`;
            
            showConfirmDialog(
                "Verify Telegram Account",
                `Please click 'Go to Bot' to open your Telegram app and send the verification message to @${botUsername}.`,
                () => {
                    window.open(telegramBotLink, '_blank');
                    showAlertDialog("Verification Pending", "After clicking 'Go to Bot', please send the verification message. Your dashboard will update once verified by the bot.");
                },
                () => {
                    showAlertDialog("Cancelled", "Telegram verification was cancelled.");
                }
            );

        } catch (error) {
            console.error("Error initiating Telegram verification:", error);
            showAlertDialog("Error!", error.message || "Could not initiate Telegram verification. Please try again.");
        } finally {
            setIsVerifyingTelegram(false);
        }
    };

    if (user?.accountStatus === 'banned') {
        console.log("Dashboard: User is banned. Displaying banned message.");
        return (
            <div className="dashboard-message-screen banned">
                <IoHammerOutline className="message-icon" />
                <h1 className="message-title">Account Banned</h1>
                <p className="message-text">Your account has been permanently banned due to fraudulent activity.</p>
                {user.banReason && <p className="message-detail">Reason: <span className="ban-reason-text">{user.banReason}</span></p>}
                <p className="message-text">All pending earnings have been forfeited as per our policy.</p>
                <p className="message-text">If you believe this is an error, please contact support.</p>
            </div>
        );
    }

    if (!user) {
        console.log("Dashboard: User object is null. Displaying loading/login fallback.");
        return (
            <div className="dashboard-message-screen loading">
                <IoReloadOutline className="message-icon loading-spinner" />
                <p className="message-text">You must be logged in to view the dashboard.</p>
            </div>
        );
    }

    const saveWalletAddress = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/save-wallet`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ walletAddress: localWalletAddress.trim() }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to save wallet address");
            }

            await refetchUserData(token);
            showAlertDialog("Success!", "Wallet address updated successfully!");
        } catch (err) {
            showAlertDialog("Error!", err.message || "Error saving wallet address");
        } finally {
            setSaving(false);
        }
    };

    const saveXAccount = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/save-x-account`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ xUsername: localXUsername.trim() }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to save X account");
            }

            await refetchUserData(token);
            showAlertDialog("Success!", "X account updated successfully!");
        } catch (err) {
            showAlertDialog("Error!", err.message || "Error saving X account");
        } finally {
            setSaving(false);
        }
    };

    const handlePayoutRequest = async () => {
        if (!user.walletAddress || user.walletAddress.trim() === '') {
            showAlertDialog("Error", "Please save your wallet address before requesting a payout.");
            return;
        }

        const amount = Number(payoutAmount);
        if (isNaN(amount) || amount < 50) {
            showAlertDialog("Error", "Minimum payout amount is $50.");
            return;
        }

        if (amount > user.pendingEarnings) {
            showAlertDialog("Error", "Requested amount exceeds your available earnings.");
            return;
        }

        showConfirmDialog(
            "Confirm Payout Request",
            `Are you sure you want to request a payout of $${amount.toFixed(2)}? This amount will be deducted from your available earnings.`,
            async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/request-payout`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ amount: amount }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || "Failed to request payout");

                    showAlertDialog("Success!", data.message);
                    setPayoutAmount("");
                    setShowPayout(false);
                    await refetchUserData(token);

                } catch (err) {
                    showAlertDialog("Error!", err.message || "An unexpected error occurred during payout request.");
                }
            },
            () => {
                setMessage({ type: "info", text: "Payout request cancelled." });
            }
        );
    };

    const MAX_TRUST_SCORE = 1000;
    const currentTrustScore = user.reputationScore || 0;
    const trustScorePercentage = (currentTrustScore / MAX_TRUST_SCORE) * 100;

    return (
        <div className="dashboard-outer-wrapper">
            <div className="dashboard-container">
                <h1 className="dashboard-title">User Dashboard</h1>

                {/* User Profile Header */}
                <div className="profile-card glass-panel">
                    <div className="profile-details">
                        <img
                            src={user.telegramPhotoUrl || `https://unavatar.io/twitter/${user.username}?size=128`}
                            alt={user.name}
                            className="user-avatar"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/128x128/2C3E50/A0AEC0?text=USER";
                            }}
                        />
                        <div className="user-info">
                            <h2 className="user-name">{user.name}</h2>
                            <p className="user-username">@{user.username}</p>
                            {user.xUsername && (
                                <p className="user-x-handle"><FaTwitter className="x-icon" /> @{user.xUsername}</p>
                            )}
                            {user.telegramUsername && (
                                <p className="user-telegram-handle"><FaTelegramPlane className="telegram-icon" /> @{user.telegramUsername}</p>
                            )}
                            {user.reputationScore !== undefined && (
                                <div className="trust-score-container">
                                    <p className="trust-score-label">Trust Score:</p>
                                    <span className="trust-score-value">{currentTrustScore} / {MAX_TRUST_SCORE}</span>
                                    <div className="trust-score-bar">
                                        <div
                                            className="trust-score-fill"
                                            style={{ width: `${trustScorePercentage}%` }}
                                            title={`Your trust score is ${currentTrustScore}`}
                                        ></div>
                                    </div>
                                    <p className="trust-score-info-text">
                                        <IoInformationCircleOutline className="info-icon" /> Your trust score grows as your task submissions are successfully verified by campaign creators and by the payouts.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        className="rules-button action-button-secondary"
                        onClick={() => setShowRulesModal(true)}
                        type="button"
                    >
                        <IoHammerOutline className="button-icon" /> View Rules
                    </button>
                </div>

                <section className="dashboard-metrics-grid">
                    <div className="metric-box glass-panel">
                        <h3 className="metric-box-title"><IoCashOutline className="icon-title" /> Available Balance</h3>
                        <p className="metric-value earnings-value">
                            ${user.pendingEarnings ? user.pendingEarnings.toFixed(2) : '0.00'}
                        </p>
                    </div>

                    <div className="metric-box wallet-management glass-panel">
                        <h3 className="metric-box-title"><IoWalletOutline className="icon-title" /> Wallet Address</h3>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Your wallet address (SOL)"
                                className="input-field"
                                value={localWalletAddress}
                                onChange={(e) => setLocalWalletAddress(e.target.value)}
                                disabled={saving}
                            />
                            <button
                                onClick={saveWalletAddress}
                                className="save-button action-button-primary"
                                disabled={saving}
                                type="button"
                            >
                                {saving ? <IoReloadOutline className="icon-spinner" /> : <IoSaveOutline />}
                                {saving ? 'Saving...' : 'Save Wallet'}
                            </button>
                        </div>
                        <p className="x-account-info-text">
                            <IoInformationCircleOutline className="info-icon" /> Payouts will be sent in USDC by default.
                        </p>
                    </div>

                    <div className="metric-box x-account-management glass-panel">
                        <h3 className="metric-box-title"><FaTwitter className="icon-title" /> Link your X Account</h3>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Enter your username (@yourhandle)"
                                className="input-field"
                                value={localXUsername}
                                onChange={(e) => setLocalXUsername(e.target.value)}
                                disabled={saving}
                            />
                            <button
                                onClick={saveXAccount}
                                className="save-button action-button-primary"
                                disabled={saving}
                                type="button"
                            >
                                {saving ? <IoReloadOutline className="icon-spinner" /> : <IoSaveOutline />}
                                {saving ? 'Saving...' : 'Save X Account'}
                            </button>
                        </div>
                        <p className="x-account-info-text">
                            <IoInformationCircleOutline className="info-icon" /> Link your X account to ensure proper verification for X-related tasks.
                        </p>
                    </div>

                    <div className="metric-box telegram-account-management glass-panel">
                        <h3 className="metric-box-title"><FaTelegramPlane className="icon-title" /> Link your Telegram Account</h3>
                        
                        {user.telegramUserId ? (
                            <div className="linked-account-info">
                                <p className="linked-status">
                                    <IoCheckmarkCircle className="success-icon" /> Telegram Account Linked!
                                </p>
                                <p className="linked-detail">
                                    @{user.telegramUsername || user.telegramFirstName || 'Telegram User'}
                                </p>
                                <p className="info-text">
                                    <IoInformationCircleOutline className="info-icon" /> {user.telegramUserId ? "Your Telegram account is linked and ready for campaigns." : "Enter your Telegram username to link your account. You will then be redirected to our bot for verification."}
                                </p>
                            </div>
                        ) : (
                            <div className="link-account-section">
                                <p className="info-text">
                                    <IoInformationCircleOutline className="info-icon" /> Enter your Telegram username below to link your account. You will then be redirected to our bot for verification.
                                </p>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        placeholder="Enter your Telegram @username"
                                        className="input-field"
                                        value={telegramUsernameInput}
                                        onChange={(e) => setTelegramUsernameInput(e.target.value)}
                                        disabled={user.telegramUserId || isVerifyingTelegram}
                                        readOnly={user.telegramUserId} // Optional: make it read-only for clarity
                                    />
                                    {user.telegramUserId ? (
                                        <button
                                            className="save-button action-button-secondary linked-status-button" // Use a different style for linked status
                                            disabled // Disable the button when linked
                                            type="button"
                                        >
                                            <IoCheckmarkCircle className="button-icon" /> Linked
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleTelegramVerify}
                                            className="save-button action-button-primary"
                                            disabled={isVerifyingTelegram}
                                            type="button"
                                        >
                                            {isVerifyingTelegram ? <IoReloadOutline className="icon-spinner" /> : <IoLinkOutline />}
                                            {isVerifyingTelegram ? 'Verifying...' : 'Verify Telegram'}
                                        </button>
                                    )}
                                </div>
                                {/* Optional: Add a message for successful linking, which might fade out */}
                                {user.telegramUserId && !isVerifyingTelegram && (
                                    <p className="success-message"><IoCheckmarkCircle /> Account successfully linked!</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="metric-box payout-request glass-panel">
                        <h3 className="metric-box-title"><IoCashOutline className="icon-title" /> Request Payout</h3>
                        {!showPayout ? (
                            <button
                                className="request-payout-button action-button-primary"
                                onClick={() => setShowPayout(true)}
                                disabled={user.pendingEarnings < 50}
                                title={user.pendingEarnings < 50 ? "Minimum $50 required for payout" : ""}
                                type="button"
                            >
                                <IoArrowForwardOutline className="button-icon" /> Initiate Payout
                            </button>
                        ) : (
                            <div className="payout-form-expanded">
                                <input
                                    type="number"
                                    min="50"
                                    step="0.01"
                                    placeholder={`Amount (min $50, max $${user.pendingEarnings.toFixed(2)})`}
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    className="input-field payout-amount-input"
                                />
                                <div className="payout-action-buttons">
                                    <button
                                        onClick={handlePayoutRequest}
                                        className="submit-payout-button action-button-primary"
                                        type="button"
                                    >
                                        Submit Request
                                    </button>
                                    <button
                                        onClick={() => setShowPayout(false)}
                                        className="cancel-payout-button action-button-secondary"
                                        type="button"
                                    >
                                        <IoClose className="button-icon" /> Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {message && (
                    <div className={`feedback-card glass-panel ${message.type === "success" ? "success" : "error"}`}>
                        {message.type === "success" ? <IoCheckmarkCircle className="feedback-icon" /> : <IoWarningOutline className="feedback-icon" />}
                        <p className="feedback-text">{message.text}</p>
                    </div>
                )}

                <RulesModal
                    show={showRulesModal}
                    onClose={() => setShowRulesModal(false)}
                />
            </div>
        </div>
    );
};

export default Dashboard;