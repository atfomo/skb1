
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../../UserContext';
import './UserVolumeTask.css'; // Link to the new CSS file
import { API_BASE_URL } from '../../config';



const DEX_LINKS = {
    'Raydium': 'https://raydium.io/swap/',
    'Orca': 'https://app.orca.so/swap',
    'Jupiter': 'https://jup.ag/swap',
    'Other': 'Please refer to campaign notes for custom DEX link.',
};

const UserVolumeTask = () => {
    const { campaignId } = useParams();
    const { user, token, loadingUser: loadingUserContext } = useUser();

    const [campaignDetails, setCampaignDetails] = useState(null);
    const [userWalletInput, setUserWalletInput] = useState('');
    const [associatedWallet, setAssociatedWallet] = useState(null);
    const [completedLoops, setCompletedLoops] = useState(0); // This will store VERIFIED loops
    const [pendingLoops, setPendingLoops] = useState(0);     // This will store PENDING loops
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [loadingComponentData, setLoadingComponentData] = useState(true);

    const [totalLoopsCompletedByAllUsers, setTotalLoopsCompletedByAllUsers] = useState(0);
    const [currentUsersParticipating, setCurrentUsersParticipating] = useState(0);

    
    
    
    
    


    const fetchCampaignStatus = useCallback(async () => {
        
        if (!campaignId || !token) {
            console.warn("[fetchCampaignStatus] Skipping fetch: campaignId or token is missing. This should ideally be caught by useEffect.", { campaignId, tokenAvailable: !!token });
            return;
        }

        try {
            
            const response = await axios.get(`${API_BASE_URL}/api/boost-volume/campaigns/${campaignId}/status`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            const { campaignDetails: backendCampaign, userProgress: backendUserProgress } = response.data;
            

            const mappedDetails = {
                campaignName: backendCampaign.campaignName,
                tokenAddress: backendCampaign.tokenAddress,
                dexName: backendCampaign.dexName,
                dexLink: DEX_LINKS[backendCampaign.dexName] || DEX_LINKS['Other'],
                volumePerLoopUSD: backendCampaign.volumePerLoopUSD,
                loopsPerUser: backendCampaign.loopsPerUser,
                totalCampaignLoops: backendCampaign.totalCampaignLoops,
                usersNeeded: backendCampaign.overallCampaignUsersNeeded,
                quoteTokenSymbol: backendCampaign.quoteTokenSymbol || "SOL",
                payoutPerLoopUSD: backendCampaign.payoutPerLoopUSD,
                status: backendCampaign.status,
            };

            setCampaignDetails(mappedDetails);
            setTotalLoopsCompletedByAllUsers(backendCampaign.currentLoopsCompleted || 0);
            setCurrentUsersParticipating(backendCampaign.currentParticipants || 0);

            if (backendUserProgress) {
                setAssociatedWallet(backendUserProgress.associatedWallet);
                setUserWalletInput(backendUserProgress.associatedWallet || '');
                setCompletedLoops(backendUserProgress.completedLoops); // Set VERIFIED loops
                setPendingLoops(backendUserProgress.pendingLoops || 0); // Set PENDING loops
                
            } else {
                
                setCompletedLoops(0);
                setPendingLoops(0);
            }

            setMessage('Campaign details loaded.');

        } catch (err) {
            console.error("[fetchCampaignStatus] Failed to fetch BoostVolume campaign details or status:", err.response?.data || err.message);
            if (err.response?.status === 401) {
                setMessage('Unauthorized: Your session has expired. Please log in again.');
            } else if (err.response?.status === 404) {
                setMessage('BoostVolume campaign not found.');
            } else {
                setMessage(`Error: ${err.response?.data?.message || err.message || 'Failed to load campaign data.'}`);
            }
        } finally {
            
            setLoadingComponentData(false);
        }
    }, [campaignId, token]);


    useEffect(() => {
        

        if (loadingUserContext) {
            setLoadingComponentData(true);
            setMessage('Initializing user session...');
            
            return;
        }

        if (campaignId && user && token) {
            setLoadingComponentData(true);
            setMessage('Loading BoostVolume campaign details...');
            fetchCampaignStatus();
        } else if (!campaignId) {
            setLoadingComponentData(false);
            setMessage('Error: No campaign ID provided in the URL.');
            console.error("[useEffect] No campaignId in URL.");
        } else {
            setLoadingComponentData(false);
            setMessage('Error: User not authenticated. Please log in to view campaign details.');
            console.error("[useEffect] UserContext finished loading, but user or token missing. User:", !!user, "Token:", !!token);
        }
    }, [campaignId, user, token, loadingUserContext, fetchCampaignStatus]);


    const isValidSolanaAddress = (address) => {
        return typeof address === 'string' && address.length >= 32 && address.length <= 44;
    };


    const handleSaveWallet = async () => {
        
        if (!userWalletInput.trim()) {
            setMessage('Please enter your Solana wallet address for this BoostVolume task.');
            return;
        }
        if (!isValidSolanaAddress(userWalletInput)) {
            setMessage('Please enter a valid Solana wallet address.');
            return;
        }
        if (!token) {
            setMessage('Error: You must be logged in to save your wallet.');
            return;
        }

        setIsSubmitting(true);
        setMessage('Saving your wallet address...');
        

        try {
            const response = await axios.post(`${API_BASE_URL}/api/boost-volume/participate`,
                { campaignId, walletAddress: userWalletInput },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            
            setAssociatedWallet(userWalletInput);
            setMessage(response.data.message || 'Your wallet address has been saved successfully for this BoostVolume task!');


            setCompletedLoops(response.data.completedLoops || 0);
            setPendingLoops(response.data.pendingLoops || 0);

        } catch (error) {
            console.error('[handleSaveWallet] Save wallet failed:', error.response?.data || error.message);
            setMessage(`Failed to save wallet: ${error.response?.data?.message || error.message || 'An error occurred.'}`);
        } finally {
            setIsSubmitting(false);
            
        }
    };


    const handleMarkAsDone = async () => {
        
        if (!associatedWallet) {
            setMessage('Please save your wallet address first.');
            console.warn("[handleMarkAsDone] No associated wallet.");
            return;
        }

        const totalUserSubmittedLoops = completedLoops + pendingLoops;
        if (campaignDetails && totalUserSubmittedLoops >= campaignDetails.loopsPerUser) {
            setMessage('You have already completed or submitted all allowed BoostVolume loops for this campaign.');
            console.warn("[handleMarkAsDone] All loops completed or submitted by user.");
            return;
        }
        if (campaignDetails && totalLoopsCompletedByAllUsers >= campaignDetails.totalCampaignLoops) {
            setMessage('The BoostVolume campaign has already reached its target volume. No more loops are needed.');
            console.warn("[handleMarkAsDone] Campaign target volume reached.");
            return;
        }
        if (!token) {
            setMessage('Error: You must be logged in to mark a loop as done.');
            console.warn("[handleMarkAsDone] Token missing.");
            return;
        }

        setIsSubmitting(true);
        setMessage('Marking loop as done. Your wallet activity will be monitored for verification...');
        

        try {
            const response = await axios.post(`${API_BASE_URL}/api/boost-volume/mark-done`,
                { campaignId, walletAddress: associatedWallet },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            
            setMessage(response.data.message || 'Your BoostVolume activity is being verified. Please check back shortly for updates.');


            await new Promise(resolve => setTimeout(resolve, 2000));


            setCompletedLoops(response.data.completedLoops || 0);
            setPendingLoops(response.data.pendingLoops || 0);

        } catch (error) {
            console.error("[handleMarkAsDone] Mark as done failed:", error.response?.data || error.message);
            setMessage(`Failed to mark BoostVolume loop as done: ${error.response?.data?.message || error.message || 'An error occurred.'}`);
        } finally {
            setIsSubmitting(false);
            
        }
    };


    if (loadingUserContext || loadingComponentData) {
        
        return (
            <div className="user-volume-loading-overlay">
                <div className="loading-spinner"></div>
                <p className="loading-text">{message || 'Loading campaign details...'}</p>
            </div>
        );
    }

    if (!campaignDetails) {
        
        return (
            <div className="user-volume-error-message">
                BoostVolume campaign details could not be loaded. Please ensure the campaign ID is valid or you are logged in.
                {message && <p>{message}</p>} {}
            </div>
        );
    }


    const totalUserSubmittedLoops = completedLoops + pendingLoops; // Sum of verified and pending
    const loopsRemainingForUser = campaignDetails.loopsPerUser - totalUserSubmittedLoops; // How many more the user can do
    const canMarkMoreDoneByUser = loopsRemainingForUser > 0;

    const overallLoopsRemaining = campaignDetails.totalCampaignLoops - totalLoopsCompletedByAllUsers;
    const overallCampaignProgressPercent = campaignDetails.totalCampaignLoops > 0
        ? ((totalLoopsCompletedByAllUsers / campaignDetails.totalCampaignLoops) * 100).toFixed(2)
        : 0;
    const usersStillNeeded = campaignDetails.usersNeeded - currentUsersParticipating;

    console.log("[Render] Displaying campaign details. Current State:", {
        campaignDetails,
        associatedWallet,
        completedLoops,
        pendingLoops,
        totalUserSubmittedLoops,
        totalLoopsCompletedByAllUsers,
        currentUsersParticipating
    });


    return (
        <div className="user-volume-page-wrapper"> {}
            <div className="user-task-container"> {}
                <h2 className="task-title">Participate in: {campaignDetails.campaignName}</h2>
                <p className="task-subtitle">Help boost volume for {campaignDetails.tokenAddress.substring(0, 6)}...{campaignDetails.tokenAddress.slice(-4)} on Solana via <strong className="highlight-text">BoostVolume</strong>!</p>

                <hr className="section-divider" />

                <div className="campaign-overview-section">
                    <h3 className="section-heading">Campaign Progress Overview</h3>
                    <p className="overview-text">Total Campaign Loops: <span className="value-highlight">{campaignDetails.totalCampaignLoops.toLocaleString()}</span></p>
                    <p className="overview-text">Loops Completed So Far: <span className="value-highlight">{totalLoopsCompletedByAllUsers.toLocaleString()}</span></p>
                    <p className="overview-text">Loops Remaining for Campaign: <span className="value-highlight">{overallLoopsRemaining.toLocaleString()}</span></p>
                    <div className="progress-bar-overall-container">
                        <div
                            className="progress-bar-overall-fill"
                            style={{ width: `${overallCampaignProgressPercent > 100 ? 100 : overallCampaignProgressPercent}%` }}
                        ></div>
                        <span className="progress-bar-overall-text">{overallCampaignProgressPercent}% Completed</span>
                    </div>
                    {usersStillNeeded > 0 && <p className="overview-text">Users Still Needed: <span className="value-highlight">{usersStillNeeded.toLocaleString()}</span></p>}
                    {overallLoopsRemaining <= 0 && (
                        <p className="campaign-completed-message">This BoostVolume campaign has reached its target!</p>
                    )}
                </div>

                <hr className="section-divider" />

                <div className="wallet-section">
                    <h3 className="section-heading">1. Enter & Save Your Solana Wallet</h3>
                    {!associatedWallet ? (
                        <div className="wallet-input-group">
                            <input
                                type="text"
                                value={userWalletInput}
                                onChange={(e) => setUserWalletInput(e.target.value)}
                                placeholder="Paste your Solana wallet address here (e.g., Phantom, Solflare)"
                                className="wallet-input"
                                disabled={isSubmitting}
                            />
                            <button onClick={handleSaveWallet} className="primary-action-button" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Wallet'}
                            </button>
                        </div>
                    ) : (
                        <div className="connected-wallet-info">
                            <p className="connected-status">
                                Your Wallet: <span className="wallet-address-display">{associatedWallet.substring(0, 8)}...{associatedWallet.slice(-8)}</span>
                            </p>
                            <button onClick={() => setAssociatedWallet(null)} className="secondary-action-button">Change Wallet</button>
                        </div>
                    )}
                </div>

                <hr className="section-divider" />

                <div className="task-details-section">
                    <h3 className="section-heading">2. Perform Trading Loops</h3>
                    <p className="task-detail-text">You need to perform <strong className="value-highlight">{campaignDetails.loopsPerUser} buy/sell loop(s)</strong> for this <strong className="highlight-text">BoostVolume</strong> campaign.</p>
                    <p className="task-detail-text">Each loop generates <strong className="value-highlight">${campaignDetails.volumePerLoopUSD} USD</strong> in volume (${campaignDetails.volumePerLoopUSD / 2} buy + ${campaignDetails.volumePerLoopUSD / 2} sell).</p>
                    <p className="highlight-earning">
                        <strong className="value-highlight">Your Estimated Earnings:</strong> You will earn <strong className="value-highlight">${campaignDetails.payoutPerLoopUSD.toFixed(4)}</strong> per completed loop.
                    </p>

                    <div className="instructions-card">
                        <h4>Instructions for One Loop:</h4>
                        <ol className="instructions-list">
                            <li>Go to the DEX: <a href={campaignDetails.dexLink} target="_blank" rel="noopener noreferrer" className="dex-link">{campaignDetails.dexName}</a></li>
                            <li><strong className="instruction-step">BUY</strong> approximately <strong className="value-highlight">${campaignDetails.volumePerLoopUSD / 2}</strong> worth of `<span className="token-address-short">{campaignDetails.tokenAddress.substring(0, 6)}...</span>` using <strong className="value-highlight">{campaignDetails.quoteTokenSymbol}</strong>.
                                <br/><span className="hint-text">Ensure you have enough {campaignDetails.quoteTokenSymbol} and a small amount of SOL for network fees.</span>
                            </li>
                            <li>Wait ~1-2 minutes (to make transactions look more organic).</li>
                            <li><strong className="instruction-step">SELL</strong> approximately <strong className="value-highlight">${campaignDetails.volumePerLoopUSD / 2}</strong> worth of `<span className="token-address-short">{campaignDetails.tokenAddress.substring(0, 6)}...</span>` back to <strong className="value-highlight">{campaignDetails.quoteTokenSymbol}</strong>.</li>
                        </ol>
                        <p className="warning-text">
                            <strong className="highlight-text">Important:</strong> Always pay attention to <strong className="highlight-text">gas fees</strong> and <strong className="highlight-text">slippage settings</strong> on the DEX. Excessive gas or slippage might impact your profitability.
                        </p>
                    </div>
                </div>

                <hr className="section-divider" />

                <div className="submission-section">
                    <h3 className="section-heading">3. Mark Loop as Done</h3>
                    <p className="submission-info-text">Total loops submitted by you: <strong className="value-highlight">{totalUserSubmittedLoops}</strong></p>

                    {canMarkMoreDoneByUser && overallLoopsRemaining > 0 ? (
                        <button
                            onClick={handleMarkAsDone}
                            className="primary-action-button"
                            disabled={isSubmitting || !associatedWallet}
                        >
                            {isSubmitting ? 'Processing...' : `Mark BoostVolume Loop ${totalUserSubmittedLoops + 1} as Done`}
                        </button>
                    ) : (
                        <>
                            {totalUserSubmittedLoops >= campaignDetails.loopsPerUser && (
                                <p className="info-message">You have completed all allowed <strong className="highlight-text">BoostVolume</strong> loops for this campaign!</p>
                            )}
                            {overallLoopsRemaining <= 0 && (
                                <p className="info-message">This <strong className="highlight-text">BoostVolume</strong> campaign has already reached its target volume. No more loops are needed!</p>
                            )}
                        </>
                    )}
                    {message && <p className="status-message">{message}</p>}
                </div>

                <hr className="section-divider" />

                <p className="note-text">Your wallet <span className="wallet-address-display">{associatedWallet ? associatedWallet.substring(0, 8) + '...' + associatedWallet.slice(-8) : 'address'}</span> will be monitored for verification of your <strong className="highlight-text">BoostVolume</strong> activity. Your earnings will be processed after successful verification.</p>
            </div>
        </div>
    );
};

export default UserVolumeTask;