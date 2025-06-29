// client/src/components/RulesModal.jsx

import React, { useState, useEffect } from 'react';
import './RulesModal.css';

// Added onAcknowledge and isMandatory to props
const RulesModal = ({ show, onClose, onAcknowledge, isMandatory }) => {
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        if (show) {
            setActiveTab('general');
            // Disable body scrolling when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            // Re-enable body scrolling when modal is closed
            document.body.style.overflow = 'unset';
        }
        // Cleanup function for useEffect
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [show]);

    if (!show) {
        return null;
    }

    // Function to handle overlay click, only close if not mandatory
    const handleOverlayClick = () => {
        if (!isMandatory) {
            onClose();
        }
    };

    return (
        <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={handleOverlayClick}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* Conditionally render close button */}
                {!isMandatory && (
                    <button className="modal-close-button" onClick={onClose}>
                        &times;
                    </button>
                )}
                <h2 className="modal-title">Rules by @FOMO</h2>

                {/* Tab Navigation */}
                <div className="rules-tabs">
                    <button
                        className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General Rules
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'drip' ? 'active' : ''}`}
                        onClick={() => setActiveTab('drip')}
                    >
                        Drip Tasks
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'spark' ? 'active' : ''}`}
                        onClick={() => setActiveTab('spark')}
                    >
                        Spark Tasks
                    </button>
                </div>

                {/* Tab Content */}
                <div className="modal-body">
                    {activeTab === 'general' && (
                        <div className="tab-pane">
                            <h3>General Rules</h3>
                            <p>To ensure a fair and high-quality experience for everyone on @FOMO, please adhere to these fundamental rules.</p>

                            <h4>1. Profile Setup: Your Gateway to Tasks</h4>
                            <p>Before you can begin any task, it's crucial to set up your profile completely. This includes:</p>
                            <ul>
                                <li>
                                    <strong>X (formerly Twitter) Account Linkage:</strong> Connect your primary X account. This is essential for verifying social media tasks.
                                </li>
                                <li>
                                    <strong>Telegram Account Linkage:</strong> Link your Telegram account for communication and specific task types.
                                </li>
                                <li>
                                    <strong>Solana Wallet Address:</strong> Provide a valid Solana (SOL) wallet address. This is the only wallet type supported for payouts at this time, and it's where you'll receive your earnings.
                                </li>
                            </ul>
                            <p><strong>Incomplete profile setups will prevent you from verifying tasks and delayed payouts.</strong></p>

                            <h4>2. Trust Score: Your Reputation on @FOMO</h4>
                            <p>Your **Trust Score** is a vital metric that reflects your reliability and quality as an earner on our platform.</p>
                            <ul>
                                <li>
                                    <strong>Increase Your Score:</strong> Your Trust Score will **increase with every successful payout** you receive, indicating consistent and high-quality task completion.
                                </li>
                                <li>
                                    <strong>Violations and Suspension:</strong> Any violations of our rules, detected through our verification processes, will **negatively impact your Trust Score**. Severe or repeated violations may lead to **account suspension or a permanent ban** from the platform.
                                </li>
                            </ul>

                            <h4>3. Emphasizing Natural and Authentic Task Completion</h4>
                            <p>To ensure high-quality engagement and prevent spam-like behavior, earners must complete tasks naturally, as if they were genuine users interacting with content. This isn't just about speed; it's about authenticity and relevance.</p>
                            <h5>Here's how we define natural task completion:</h5>
                            <ul>
                                <li>
                                    <strong>Authentic Engagement:</strong> Tasks should be approached with genuine human thought and interaction. This means taking the time to understand the task's context, evaluating the content, and responding thoughtfully.
                                </li>
                                <li>
                                    <strong>Natural Pacing:</strong> Avoid completing tasks at an unnatural or accelerated pace that suggests automation or a lack of attention. Our systems monitor for rapid-fire submissions that deviate from typical human behavior, as this is often a sign of non-genuine activity.
                                </li>
                                <li>
                                    <strong>Meaningful Comments and Contributions:</strong> For tasks requiring comments or written input, your contributions must be original, relevant, and add value. Generic, repetitive, or bot-like phrases (e.g., "Great post!" on every task, random emojis, or keyword stuffing) are strictly prohibited. Comments should reflect an actual understanding of the content and sound like something a real person would say.
                                </li>
                            </ul>
                            <p>We are committed to maintaining the integrity of our platform. Tasks completed in a spam-like manner, or with generic, inauthentic responses, will be rejected and will negatively impact your Reputation/Trust Score, potentially leading to account suspension or permanent ban. We encourage all earners to focus on quality and authenticity, as this ensures fair rewards and a healthy platform for everyone.</p>
                        </div>
                    )}

                    {activeTab === 'drip' && (
                        <div className="tab-pane">
                            <h3>Rules for Drip Tasks</h3>
                            <p>Drip tasks are designed for quick, focused engagements. Adherence to these rules is crucial for successful completion and reward:</p>
                            <ul>
                                <li><strong>Timely Completion:</strong> Drip tasks are time-sensitive. Complete them as soon as possible after they appear.</li>
                                <li><strong>Authenticity is Key:</strong> Even for simple actions, ensure your account appears active and genuine. Avoid suspicious patterns (e.g., liking hundreds of posts in seconds).</li>
                                <li><strong>No Undoing Actions:</strong> Once you've completed a Drip task (e.g., liked a tweet), do not undo the action. Verification checks are performed, and un-liked/un-retweeted content will result in disqualification.</li>
                                <li><strong>No Mass Following/Unfollowing:</strong> While some Drip tasks might involve following, do not engage in mass following or unfollowing practices immediately after completing tasks, as this can flag your account as suspicious.</li>
                            </ul>
                            <p>Drip tasks are verified quickly. Any violation will lead to immediate task rejection and a negative impact on your reputation score.</p>
                        </div>
                    )}

                    {activeTab === 'spark' && (
                        <div className="tab-pane">
                            <h3>Spark Task Rules</h3>
                            <p>Spark tasks are designed for creators seeking high-impact, outcome-focused engagement within their Telegram communities. For users (Engagers), Spark tasks offer the opportunity for consistent earnings through varied and verified actions.</p>

                            <h4>For Engagers (Users): Maximize Your Earnings</h4>
                            <p>Spark tasks offer dynamic earning opportunities. Here's how to ensure you're maximizing your potential and contributing effectively:</p>

                            <h5>1. Understanding the Pay-Per-Action Model:</h5>
                            <ul>
                                <li>Unlike tasks with a fixed payout per user, Spark tasks reward you for every valid action you perform (e.g., messages, link clicks, reactions).</li>
                                <li>Your earnings accumulate in real-time as long as the campaign is active and its reward budget is available.</li>
                                <li>No fixed limits: The more genuinely you engage, the more you can earn from a single Spark campaign.</li>
                            </ul>

                            <h5>2. Joining and Engaging with Spark Campaigns:</h5>
                            <ul>
                                <li>Browse & Select: On the Spark Campaign Grid, you'll see active Spark campaigns with clear details: Project Name, Brief Description, Remaining Time, and the "Current Funds Available for Rewards."</li>
                                <li>Understand Payouts: Each listing explicitly shows your potential earnings per action.</li>
                                <li>Join the Group: Click the provided link to join the creator's public Telegram group.</li>
                                <li>Active Participation: Engage genuinely by:
                                    <ul>
                                        <li>Sending valid chat messages (relevant to the discussion, not just spam like "." or random emojis).</li>
                                        <li>Clicking specified links (e.g., to a tweet, website, etc).</li>
                                        <li>Reacting to messages (as specified by the campaign, e.g., using specific emojis).</li>
                                    </ul>
                                </li>
                            </ul>

                            <h5>3. Real-Time Earnings and Payouts:</h5>
                            <ul>
                                <li>Accumulated Earnings: Your accumulated earnings from all active campaigns are visible on your @FOMO User dashboard or you can type '/myrewards' inside the @AtfomoBot to know your earnings.</li>
                            </ul>

                            <h5>4. Key Engagement Standards for Spark Tasks:</h5>
                            <ul>
                                <li>Quality over Quantity (for Messages): While we reward per message, focus on contributing meaningfully. Generic, repetitive, or bot-like phrases are strictly prohibited and will not be counted as valid. Your messages should reflect actual understanding and sound like a real person engaging.</li>
                                <li>Adherence to Prompts: Always follow the creator's specific engagement prompts (e.g., "Discuss our new staking feature," "Check out our latest tweet").</li>
                                <li>No Undoing Actions: Once you perform a valid action (e.g., send a message, click a link, add a reaction), do not undo it. Our verification systems track completed actions, and undoing them will result in disqualification for that action.</li>
                                <li>Authenticity is Paramount: All your interactions must appear natural and human. Any suspicious patterns (e.g., extreme rapid-fire actions, bot-like behavior) will lead to actions being rejected and could impact your Trust Score.</li>
                            </ul>

                            <h5>5. Campaign Conclusion:</h5>
                            <ul>
                                <li>Budget Depletion: A Spark campaign can end early if the total value of all valid user actions exhausts the creator's budget before the chosen time limit. This means high user activity is driving maximum engagement.</li>
                                <li>Time Limit Reached: If the time limit is reached and there's still budget remaining, the campaign concludes, and the unspent funds are returned to the creator. Your earnings up to that point will be finalized.</li>
                            </ul>

                            <h4>Important Note on Verification:</h4>
                            <p>All actions performed in Spark campaigns are meticulously tracked and verified by the @FOMO bot. Any action deemed invalid, inauthentic, or a violation of these rules will not be rewarded and will negatively affect your Trust Score. Consistent adherence to these guidelines ensures a healthy platform for both creators and engagers.</p>
                        </div>
                    )}
                </div>

                {/* New: Acknowledge Button - Only show if mandatory */}
                {isMandatory && (
                    <div className="modal-footer">
                        <button className="acknowledge-button" onClick={onAcknowledge}>
                            I Understand & Agree to the Rules
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RulesModal;