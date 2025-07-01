
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';

import {
    FaCoins, FaDollarSign, FaTelegramPlane, FaTwitter, FaClock, FaCalendarAlt,
    FaCheckCircle, FaHourglassHalf, FaUsers, FaTag, FaInfoCircle,
    FaMoneyBillWave, FaPercentage, FaLink, FaPlayCircle, FaTimesCircle,
    FaDiscord, FaGlobe, FaSpinner, FaBolt
} from 'react-icons/fa';

import styles from './SparkCampaignDetail.module.css';

const SparkCampaignDetail = () => {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [creatorProject, setCreatorProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [participateLoading, setParticipateLoading] = useState(false);

    const rewardRates = {
        message: 0.01,
        click: 0.025,
        reaction: 0.025,
    };

    useEffect(() => {
        const fetchCampaignAndCreatorDetails = async () => {
            if (!campaignId) {
                setError("No campaign ID provided in URL.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            setCreatorProject(null);

            try {
                const campaignResponse = await axiosInstance.get(`/api/spark-campaigns/${campaignId}`);
                const fetchedCampaign = campaignResponse.data.campaign;
                setCampaign(fetchedCampaign);

                if (fetchedCampaign.projectId && fetchedCampaign.projectId._id) {
                    setCreatorProject(fetchedCampaign.projectId);
                } else if (fetchedCampaign.creatorId && fetchedCampaign.creatorId._id) {
                    try {
                        const projectResponse = await axiosInstance.get(`/api/projects/by-creator/${fetchedCampaign.creatorId._id}`);
                        setCreatorProject(projectResponse.data);
                    } catch (projectErr) {
                        console.warn("Could not fetch creator's project details:", projectErr.message);
                        setCreatorProject(null);
                    }
                }

            } catch (err) {
                console.error("Error fetching campaign details:", err);
                if (err.response) {
                    setError(`Failed to load campaign: ${err.response.data.msg || err.message}`);
                } else if (err.request) {
                    setError("No response from server. Please check your network connection or server status.");
                } else {
                    setError(`Error: ${err.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCampaignAndCreatorDetails();
    }, [campaignId]);

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

    const MAX_ACTIONS_PER_HOUR_PER_USER = { messages: 60, clicks: 10, reactions: 10 };
    const AVG_ACTIONS_PER_HOUR_PER_USER = { messages: 20, clicks: 2, reactions: 2 };

    const calculateEarnPotential = (campaign, isMax = true) => {
        if (!campaign) return '0.00';
        const remainingHours = getRemainingHours(campaign.createdAt, campaign.durationHours);
        const currentRewardPoolBalance = campaign.currentRewardPoolBalance || 0;

        if (remainingHours <= 0 || currentRewardPoolBalance <= 0) return '0.00';

        let hourlyEarningRate = 0;
        const actionRates = isMax ? MAX_ACTIONS_PER_HOUR_PER_USER : AVG_ACTIONS_PER_HOUR_PER_USER;

        hourlyEarningRate += rewardRates.message * actionRates.messages;
        hourlyEarningRate += rewardRates.click * actionRates.clicks;
        hourlyEarningRate += rewardRates.reaction * actionRates.reactions;

        const potentialFromActivity = hourlyEarningRate * remainingHours;
        const actualEarnUpto = Math.min(potentialFromActivity, currentRewardPoolBalance);

        return actualEarnUpto > 0.01 ? actualEarnUpto.toFixed(2) : '0.00';
    };

    const formatRewardPoolBalance = (balance) => {
        if (balance === undefined || balance === null || balance <= 0) return 'N/A';
        if (balance < 1000) return balance.toFixed(0);
        return `${(balance / 1000).toFixed(1)}K+`;
    };

    const handleParticipateClick = () => {
        if (!campaign || !campaign.telegramGroupLink) {
            setError("Campaign data or Telegram group link is missing.");
            return;
        }
        setParticipateLoading(true);
        setError(null);
        window.open(campaign.telegramGroupLink, '_blank');
        setTimeout(() => setParticipateLoading(false), 1000);
    };

    if (loading) {
        return (
            <div className={`${styles.statusScreen} ${styles.loadingScreen}`}>
                <FaSpinner className={styles.spinner} />
                <h2 className={styles.statusTitle}>Loading Campaign...</h2>
                <p className={styles.statusText}>Fetching details for Spark Campaign ID: {campaignId}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${styles.statusScreen} ${styles.errorScreen}`}>
                <FaTimesCircle className={styles.iconLarge} />
                <h2 className={styles.statusTitle}>Error Loading Campaign</h2>
                <p className={styles.statusText}>{error}</p>
                <button onClick={() => navigate('/spark-campaigns')} className={styles.actionButton}>
                    Back to Campaigns
                </button>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className={`${styles.statusScreen} ${styles.noDataScreen}`}>
                <FaInfoCircle className={styles.iconLarge} />
                <h2 className={styles.statusTitle}>Campaign Not Found</h2>
                <p className={styles.statusText}>The campaign you are looking for does not exist or has been removed.</p>
                <button onClick={() => navigate('/spark-campaigns')} className={styles.actionButton}>
                    Back to Campaigns
                </button>
            </div>
        );
    }

    const timeRemainingDisplay = formatTimeRemaining(campaign.createdAt, campaign.durationHours);
    const isEnded = timeRemainingDisplay === 'Ended' || campaign.status === 'ended' || campaign.currentRewardPoolBalance <= 0;
    const earnPotentialValue = calculateEarnPotential(campaign, true);
    const typicalEarningsValue = calculateEarnPotential(campaign, false);
    const rewardPoolPercentage = campaign.userRewardPool && campaign.userRewardPool > 0
        ? ((campaign.currentRewardPoolBalance || 0) / campaign.userRewardPool) * 100
        : 0;

    const bannerImageUrl = creatorProject?.bannerImageUrl || campaign.bannerImageUrl || 'https://via.placeholder.com/1400x450/1A202C/E2E8F0?text=Campaign+Banner';
    const logoImageUrl = creatorProject?.logo || campaign.logoImageUrl || 'https://via.placeholder.com/120/FF6F00/FFFFFF?text=LOGO';

    return (
        <div className={styles.sparkCampaignDetailPage}>
            <div className={styles.campaignHeader}>
                <img src={bannerImageUrl} alt={`${creatorProject?.name || campaign.name} Banner`} className={styles.campaignBannerImage} />
                <div className={styles.campaignHeaderContent}>
                    <img
                        src={logoImageUrl}
                        alt={`${creatorProject?.name || campaign.name} Logo`}
                        className={styles.campaignLogo}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/120/FF6F00/FFFFFF?text=LOGO'; }}
                    />

                    {creatorProject?.description && <p className={styles.campaignBrief}>{creatorProject.description}</p>}

                    {creatorProject?.socials && (
                        <div className={styles.creatorSocialLinks}>
                            {creatorProject.socials.twitter && (
                                <a href={creatorProject.socials.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">
                                    <FaTwitter className={styles.socialIcon} />
                                </a>
                            )}
                            {creatorProject.socials.discord && (
                                <a href={creatorProject.socials.discord} target="_blank" rel="noopener noreferrer" title="Discord">
                                    <FaDiscord className={styles.socialIcon} />
                                </a>
                            )}
                            {creatorProject.socials.website && (
                                <a href={creatorProject.socials.website} target="_blank" rel="noopener noreferrer" title="Website">
                                    <FaGlobe className={styles.socialIcon} />
                                </a>
                            )}
                            {creatorProject.socials.telegram && (
                                <a href={creatorProject.socials.telegram} target="_blank" rel="noopener noreferrer" title="Telegram">
                                    <FaTelegramPlane className={styles.socialIcon} />
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.campaignContentWrapper}>
                <div className={styles.campaignMainContent}>
                    <section className={styles.glassPanel}>
                        <h2 className={styles.sectionHeader}> Campaign Overview</h2>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}><FaClock /> <span>Duration:</span> <strong>{campaign.durationHours} hours</strong></div>
                            <div className={styles.infoItem}><FaCalendarAlt /> <span>Created On:</span> <strong>{new Date(campaign.createdAt).toLocaleDateString()}</strong></div>
                            <div className={styles.infoItem}>
                                <FaCheckCircle /> <span>Status:</span>
                                <span className={`${styles.statusBadge} ${styles[`status${campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1).toLowerCase()}`]}`}>
                                    {campaign.status}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className={styles.glassPanel}>
                        <h2 className={styles.sectionHeader}><FaPlayCircle /> How to Participate & Earn</h2>
                        <div className={styles.rewardRatesGrid}>
                            <div className={styles.rewardRateItem}>
                                <span> Simply interact with project tweets and join the Telegram. Your genuine engagement earns you real-time rewards.</span>
                            </div>
                        </div>

                        <h3 className={styles.subHeader}><FaLink /> Essential Links:</h3>
                        {(campaign.telegramGroupLink || campaign.tweetUrl) ? (
                            <div className={styles.externalLinks}>
                                {campaign.telegramGroupLink && (
                                    <a href={campaign.telegramGroupLink} target="_blank" rel="noopener noreferrer" className={styles.actionLink}>
                                        <FaTelegramPlane /> Join Telegram Group
                                    </a>
                                )}
                                {campaign.tweetUrl && (
                                    <a href={campaign.tweetUrl} target="_blank" rel="noopener noreferrer" className={styles.actionLink}>
                                        <FaTwitter /> View Associated Tweet
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p className={styles.noLinksMessage}>No specific external links provided for this campaign.</p>
                        )}

                        <h3 className={styles.subHeader}>Important Rules:</h3>
                        <ul className={styles.rulesList}>
                            <li>
                                Authentic Engagement Only: Participate genuinely. Spamming, using bots, or artificial engagement is strictly prohibited and will result in lost earnings and account suspension.
                            </li>
                            <li>
                                Campaign End Conditions: A campaign ends when its set duration runs out (e.g., 24 hours) **OR** the entire reward pool is exhausted, whichever happens first.
                            </li>
                            <li>
                                Real-time Earnings: Your earnings are tracked automatically and updated in real-time on your @FOMO dashboard or you can easily check by typing `/myrewards` in the bot.
                            </li>
                            <li>
                                Telegram Group Etiquette: Always follow the rules of the Telegram group you join. Be respectful and constructive.
                            </li>
                            {campaign.requiredActions?.like && (
                                <li>
                                   Remember to Like, Retweet, and Comment on the designated Tweet.
                                </li>
                            )}
                            {campaign.requiredActions?.joinTelegram && (
                                <li>
                                   Ensure you've joined the official Telegram group.
                                </li>
                            )}
                        </ul>

                        {campaign.additionalInstructions && (
                            <div className={styles.additionalInstructions}>
                                <h3 className={styles.subHeader}><FaInfoCircle /> Creator's Additional Instructions:</h3>
                                <p>{campaign.additionalInstructions}</p>
                            </div>
                        )}

                        {campaign.hashtags && campaign.hashtags.length > 0 && (
                            <div className={styles.hashtagsSection}>
                                <h3 className={styles.subHeader}><FaTag /> Hashtags to Use:</h3>
                                <div className={styles.hashtagsContainer}>
                                    {campaign.hashtags.map((tag, index) => (
                                        <span key={index} className={styles.hashtagItem}>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <aside className={styles.campaignSidebar}>
                    <section className={styles.glassPanel}>
                        <h2 className={styles.sectionHeader}><FaMoneyBillWave /> Your Earning Potential</h2>
                        <div className={styles.earningsSummary}>
                            <div className={`${styles.earningBox} ${styles.maxPotential}`}>
                                <div className={styles.label}>Earn Up To</div>
                                {isEnded || parseFloat(earnPotentialValue) <= 0 ? (
                                    <div className={`${styles.value} ${styles.noEarningPotential}`}><FaDollarSign /> 0.00</div>
                                ) : (
                                    <div className={styles.value}><FaDollarSign /> {earnPotentialValue}</div>
                                )}
                                <div className={styles.note}>Based on high activity & remaining budget</div>
                            </div>
                            <div className={`${styles.earningBox} ${styles.typicalPotential}`}>
                                <div className={styles.label}>Typical Earnings</div>
                                {isEnded || parseFloat(typicalEarningsValue) <= 0 ? (
                                    <div className={`${styles.value} ${styles.noEarningPotential}`}><FaDollarSign /> 0.00</div>
                                ) : (
                                    <div className={styles.value}><FaDollarSign /> {typicalEarningsValue}</div>
                                )}
                                <div className={styles.note}>Based on average activity</div>
                            </div>
                            <div className={`${styles.earningBox} ${styles.rewardPool}`}>
                                <div className={styles.label}>Current Reward Pool</div>
                                <div className={styles.value}><FaDollarSign /> {formatRewardPoolBalance(campaign.currentRewardPoolBalance)}</div>
                                <div className={styles.progressBarContainer}>
                                    <div className={styles.progressBar} style={{ width: `${rewardPoolPercentage}%` }}></div>
                                    <span className={styles.progressText}>{rewardPoolPercentage.toFixed(0)}% Remaining</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.campaignMeta}>
                            <div className={styles.metaItem}>
                                {isEnded ? <FaTimesCircle className={styles.iconEnded} /> : <FaHourglassHalf />}
                                <span> Status:</span> <strong>{timeRemainingDisplay}</strong>
                            </div>
                            {campaign.uniqueUsersEngagedCount > 0 && (
                                <div className={styles.metaItem}>
                                    <FaUsers /> <span>Active Earners:</span> <strong>{campaign.uniqueUsersEngagedCount}</strong>
                                </div>
                            )}
                        </div>

                        {campaign.status === 'active' && campaign.telegramGroupLink && !isEnded ? (
                            <div className={styles.campaignActionCta}>
                                <button onClick={handleParticipateClick} className={styles.actionButton} disabled={participateLoading}>
                                    {participateLoading ? (
                                        <>
                                            <FaSpinner className={styles.spinner} /> Participating...
                                        </>
                                    ) : (
                                        <>
                                            <FaPlayCircle /> Participate Now!
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className={styles.campaignActionCta}>
                                <button className={`${styles.actionButton} ${styles.disabled}`} disabled>
                                    <FaTimesCircle /> Campaign {isEnded ? 'Ended' : campaign.status}
                                </button>
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
};

export default SparkCampaignDetail;