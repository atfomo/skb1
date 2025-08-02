
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import './Header.css';
import { useUser } from '../../UserContext';
import { FaTwitter, FaTelegramPlane } from 'react-icons/fa'; // Import social icons

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const userDropdownRef = useRef();
    const { user, loadingUser, logout, hasDashboard } = useUser();


    useEffect(() => {
        function handleClickOutside(event) {

            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target) && !event.target.closest('.user-avatar-button')) {
                setShowUserDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    useEffect(() => {
        setShowUserDropdown(false);
    }, [location.pathname]);

    const handleLoginClick = () => {
        navigate("/login");
    };

    const handleRegisterClick = () => {
        navigate("/register");
    };

    const goToProfile = () => {
        navigate("/dashboard"); // Assuming '/dashboard' is user's main profile/tasks page
        setShowUserDropdown(false);
    };

    const goToCreatorDashboard = () => {
        if (!user) {
            alert('Please log in to access the Creator Dashboard.');
            navigate('/login');
        } else if (!hasDashboard) {
            navigate('/create-dashboard'); // First time creator setup
        } else {
            navigate('/creator-dashboard');
        }
        setShowUserDropdown(false);
    };

    const handleCreateCampaignClick = () => {
        if (!user) {
            alert('Please log in to create a campaign.');
            navigate('/login');
            return;
        }

        navigate('/create-campaign'); // Or /create-boost-volume etc.
    };


    const handleGoToAdminCampaigns = () => {
        navigate("/admin/boost-volume/campaigns");
        setShowUserDropdown(false);
    };

    const handleGoToAdminTaskVerification = () => {
        navigate("/admin/task-verification");
        setShowUserDropdown(false);
    };


    const handleGoToAdminBannerController = () => {
        navigate("/admin/banner-controller");
        setShowUserDropdown(false);
    };

    const handleGoToPaymentReview = () => {
        navigate("/admin/payment-review");
        setShowUserDropdown(false);
    };

    return (
        <header className="app-header">
            <div className="header-container">
                <div className="header-content-wrapper">
                    <div className="header-left-section"> {}
                        <Link to="/" className="site-logo-link">
                            <img src="/logo.png" alt="@FOMO Logo" className="site-logo-img" />
                        </Link>
                        <div className="social-icons-header">
                            <a href="https://x.com/at_fomo" target="_blank" rel="noopener noreferrer" aria-label="Our X (Twitter)">
                                <FaTwitter className="social-icon-header" />
                            </a>
                            <a href="https://t.me/atfomo" target="_blank" rel="noopener noreferrer" aria-label="Our Telegram">
                                <FaTelegramPlane className="social-icon-header" />
                            </a>
                        </div>
                    </div>

                    <nav className="main-nav">
                        <Link to="/" className="nav-link">Earn</Link>
                        <Link to="/creator-dashboard" className="nav-link">Create</Link>
                        <Link to="/support" className="nav-link">Support</Link>
                        <Link to="/docs" className="nav-link">Docs</Link>
                    </nav>

                    <div className="header-right-section"> {}

                        <div className="user-auth-section">
                            {loadingUser ? (
                                <div className="loading-user-text">Loading...</div>
                            ) : user ? (
                                <>
                                    <button
                                        onClick={() => setShowUserDropdown(prev => !prev)}
                                        className="user-avatar-button"
                                        aria-label="User menu"
                                        aria-haspopup="true"
                                        aria-expanded={showUserDropdown}
                                    >
                                        <img
                                            src={`https://unavatar.io/twitter/${user.username}`}
                                            alt={`${user.name} profile`}
                                            className="user-avatar-img"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "https://abs.twimg.com/icons/apple-touch-icon-192x192.png"; // Fallback image
                                            }}
                                        />
                                    </button>

                                    {showUserDropdown && (
                                        <div
                                            ref={userDropdownRef}
                                            className="user-dropdown-menu show"
                                        >
                                            <p className="dropdown-username">{user.name}</p>
                                            <p className="dropdown-userhandle">@{user.username}</p>

                                            <button
                                                onClick={goToProfile}
                                                className="dropdown-button primary-button"
                                            >
                                                Your Profile
                                            </button>

                                            <button
                                                onClick={goToCreatorDashboard}
                                                className="dropdown-button secondary-button"
                                            >
                                                Creator Dashboard
                                            </button>

                                            {}
                                            {user.role === 'admin' && (
                                                <>
                                                    <div className="dropdown-divider"></div>
                                                    <p className="dropdown-section-title">Admin Controls</p>
                                                    <button
                                                        onClick={handleGoToAdminCampaigns}
                                                        className="dropdown-button admin-button"
                                                    >
                                                        Manage Boost Volume Campaigns
                                                    </button>
                                                    <button
                                                        onClick={handleGoToAdminTaskVerification}
                                                        className="dropdown-button admin-button"
                                                    >
                                                        Verify Tasks
                                                    </button>
                                                    {}
                                                    <button
                                                        onClick={handleGoToAdminBannerController}
                                                        className="dropdown-button admin-button"
                                                    >
                                                        Banner Controller
                                                    </button>
                                                    <button
                                                        onClick={handleGoToPaymentReview}
                                                        className="dropdown-button admin-button"
                                                    >
                                                        Payment Review
                                                    </button>
                                                </>
                                            )}
                                            {}


                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setShowUserDropdown(false);
                                                }}
                                                className="dropdown-button logout-button"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleLoginClick}
                                        className="auth-button login-button"
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={handleRegisterClick}
                                        className="auth-button register-button"
                                    >
                                        Register
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;