import React from 'react';
import { Link } from 'react-router-dom';
import {
    FaTag, FaDollarSign, FaTelegramPlane, FaTwitter, FaClock, FaCalendarAlt,
    FaCheckCircle, FaHourglassHalf, FaFire, FaUsers, FaArrowRight, FaCoins,
    FaCircle
} from 'react-icons/fa';
import './SparkCampaignCard.css';

const SparkCampaignCard = ({ campaign }) => {
    const bannerImageUrl = campaign.bannerImageUrl || 'https://placehold.co/300x600/1a1a1a/00e676?text=Spark+Campaign';

    const projectLogoUrl = campaign.projectId?.logo || 'https://placehold.co/60x60/1a1a1a/00e676?text=Project';
    const projectName = campaign.projectId?.name || 'Unknown Project';

    const activeEarnersCount = campaign.uniqueUsersEngagedCount || 0;

    // ⭐ NEW: Get the creator's name ⭐
    // Use optional chaining (?.) to safely access creatorId and then username/name
    const creatorDisplayName = campaign.creatorId?.username || campaign.creatorId?.name || 'Unknown Creator';


    const rewardRates = {
        message: 0.01,
        click: 0.025,
        reaction: 0.025,
    };

    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'status-active';
            case 'pending':
            case 'upcoming':
                return 'status-pending';
            case 'completed':
            case 'ended':
                return 'status-completed';
            default:
                return 'status-unknown';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return <FaCheckCircle className="status-icon" />;
            case 'pending':
            case 'upcoming':
                return <FaHourglassHalf className="status-icon" />;
            case 'completed':
            case 'ended':
                return <FaCheckCircle className="status-icon" />;
            default:
                return null;
        }
    };

    const getRemainingHours = (createdAt, durationHours) => {
        if (!createdAt || !durationHours) return 0;
        const createdDate = new Date(createdAt);
        const endDate = new Date(createdDate.getTime() + durationHours * 60 * 60 * 1000);
        const now = new Date();
        const timeLeftMs = endDate.getTime() - now.getTime();
        return Math.max(0, timeLeftMs / (1000 * 60 * 60));
    };

    const formatTimeRemaining = (createdAt, durationHours) => {
        const remainingHours = getRemainingHours(createdAt, durationHours);

        if (remainingHours <= 0) {
            return 'Ended';
        }

        const days = Math.floor(remainingHours / 24);
        const hours = Math.floor(remainingHours % 24);
        const minutes = Math.floor((remainingHours * 60) % 60);

        let timeString = '';
        if (days > 0) timeString += `${days}d `;
        if (hours > 0 || days > 0) timeString += `${hours}h `;
        if (minutes > 0 || (!days && !hours)) timeString += `${minutes}m`;

        return timeString.trim();
    };

    const MAX_ACTIONS_PER_HOUR_PER_USER = {
        messages: 60,
        clicks: 10,
        reactions: 10
    };

    const AVG_ACTIONS_PER_HOUR_PER_USER = {
        messages: 20,
        clicks: 2,
        reactions: 2
    };

    const calculateEarnPotential = (campaign) => {
        const remainingHours = getRemainingHours(campaign.createdAt, campaign.durationHours);
        const currentRewardPoolBalance = campaign.currentRewardPoolBalance || 0;

        if (remainingHours <= 0 || currentRewardPoolBalance <= 0) return '0.00';

        let maxHourlyEarningRate = 0;
        maxHourlyEarningRate += rewardRates.message * MAX_ACTIONS_PER_HOUR_PER_USER.messages;
        maxHourlyEarningRate += rewardRates.click * MAX_ACTIONS_PER_HOUR_PER_USER.clicks;
        maxHourlyEarningRate += rewardRates.reaction * MAX_ACTIONS_PER_HOUR_PER_USER.reactions;

        const potentialFromActivity = maxHourlyEarningRate * remainingHours;
        const actualEarnUpto = Math.min(potentialFromActivity, currentRewardPoolBalance);

        return actualEarnUpto > 0.01 ? actualEarnUpto.toFixed(2) : '0.00';
    };

    const calculateTypicalEarnings = (campaign) => {
        const remainingHours = getRemainingHours(campaign.createdAt, campaign.durationHours);
        const currentRewardPoolBalance = campaign.currentRewardPoolBalance || 0;

        if (remainingHours <= 0 || currentRewardPoolBalance <= 0) return '0.00';

        let avgHourlyEarningRate = 0;
        avgHourlyEarningRate += rewardRates.message * AVG_ACTIONS_PER_HOUR_PER_USER.messages;
        avgHourlyEarningRate += rewardRates.click * AVG_ACTIONS_PER_HOUR_PER_USER.clicks;
        avgHourlyEarningRate += rewardRates.reaction * AVG_ACTIONS_PER_HOUR_PER_USER.reactions;

        const typicalFromActivity = avgHourlyEarningRate * remainingHours;
        const actualTypicalEarning = Math.min(typicalFromActivity, currentRewardPoolBalance);

        return actualTypicalEarning > 0.01 ? actualTypicalEarning.toFixed(2) : '0.00';
    };

    const earnPotentialValue = calculateEarnPotential(campaign);
    const typicalEarningsValue = calculateTypicalEarnings(campaign);

    const formatRewardPoolBalance = (balance) => {
        if (!balance || balance <= 0) {
            return 'N/A';
        }
        if (balance < 500) {
            return balance.toFixed(0);
        }
        if (balance >= 500 && balance < 1000) {
            return '500+';
        }
        if (balance >= 1000 && balance < 1500) {
            return '1K+';
        }
        if (balance >= 1500 && balance < 2000) {
            return '1.5K+';
        }
        if (balance >= 2000) {
            const thousands = Math.floor(balance / 1000);
            const remainder = balance % 1000;
            if (remainder >= 500) {
                return `${thousands}.5K+`;
            }
            return `${thousands}K+`;
        }
        return 'N/A';
    };

    const rewardPoolPercentage = campaign.userRewardPool && campaign.userRewardPool > 0
        ? ((campaign.currentRewardPoolBalance || 0) / campaign.userRewardPool) * 100
        : 0;

    const timeRemainingDisplay = formatTimeRemaining(campaign.createdAt, campaign.durationHours);
    const hasSufficientDuration = getRemainingHours(campaign.createdAt, campaign.durationHours) > 0;

    return (
        <Link
            key={campaign._id}
            to={`/spark-campaign/${campaign._id}`}
            className="spark-campaign-card"
        >
            <div className="spark-card-background-overlay" style={{ backgroundImage: `url(${bannerImageUrl})` }}></div>

            {campaign.status === 'active' && (
                <div className="spark-campaign-top-status status-active-minimal">
                    <FaCircle className="status-indicator-icon" />
                    Active
                </div>
            )}

            <div className="spark-card-header-top">
                <img
                    src={projectLogoUrl}
                    alt={`${projectName} logo`}
                    className="spark-card-logo"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/60x60/1a1a1a/00e676?text=Project'; }}
                />
                <div className="spark-card-info-text-top">
                    {/* ⭐ MODIFIED: Display creatorDisplayName instead of campaign.name ⭐ */}
                    <h3 className="spark-card-name">
                        {creatorDisplayName}
                    </h3>
                    {campaign.briefHook && <p className="spark-card-brief-hook">{campaign.briefHook}</p>}
                </div>
            </div>

            <div className="spark-card-details-frosted-block">

                <div className="spark-card-earn-potential-highlight">
                    <div className="earn-potential-label">Earn Up To</div>
                    {hasSufficientDuration && parseFloat(earnPotentialValue) > 0 ? (
                        <div className="earn-potential-value">
                            <FaDollarSign className="earn-potential-icon" /> {earnPotentialValue}+
                        </div>
                    ) : (
                        <div className="earn-potential-value no-earning-potential">
                            <FaDollarSign className="earn-potential-icon" /> N/A
                        </div>
                    )}
                    {hasSufficientDuration && parseFloat(typicalEarningsValue) > 0 && (
                        <div className="typical-earnings-text">
                            Average Earnings: ${typicalEarningsValue}
                        </div>
                    )}
                    {(!hasSufficientDuration || parseFloat(earnPotentialValue) <= 0) && (
                        <div className="typical-earnings-text no-earning-potential-msg">
                            Potential earnings unavailable or campaign ended.
                        </div>
                    )}
                </div>

                <div className="spark-card-key-stats">
                    <div className="spark-card-stat-item">
                        <p className="stats-label">Reward Pool</p>
                        <div className="stats-value">
                            <FaDollarSign /> {formatRewardPoolBalance(campaign.currentRewardPoolBalance)}
                        </div>
                        <div className="reward-pool-progress-bar">
                            <div className="progress-fill" style={{ width: `${rewardPoolPercentage}%` }}></div>
                            <span className="progress-text">{rewardPoolPercentage.toFixed(0)}%</span>
                        </div>
                    </div>

                    <div className="spark-card-stat-item">
                        <p className="stats-label">Ends In</p>
                        <div className="stats-value stats-value-time">
                            <FaClock /> {timeRemainingDisplay}
                        </div>
                    </div>

                    {activeEarnersCount > 0 && (
                        <div className="spark-card-stat-item">
                            <p className="stats-label">🚀 Active Earners</p>
                            <div className="stats-value">
                                <FaUsers /> {activeEarnersCount}+
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default SparkCampaignCard;