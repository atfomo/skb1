
import React from 'react';
import { Link } from 'react-router-dom';
import { FaDollarSign, FaExchangeAlt, FaRedo, FaWallet } from 'react-icons/fa';
import './TaskCard.css'; // Create this CSS file

const TaskCard = ({ campaign }) => {

    const totalEstimatedEarnings = (campaign.payoutPerLoopUSD * campaign.loopsPerUser).toFixed(2);

    return (
        <div className="task-card">
            <div className="task-card-header">
                {campaign.imageUrl && <img src={campaign.imageUrl} alt={`${campaign.tokenSymbol} Logo`} className="task-logo" />}
                <h3 className="task-name">{campaign.name}</h3>
            </div>
            <p className="task-token">
                <FaWallet className="task-icon" /> Token: **{campaign.tokenSymbol}** ({campaign.tokenAddress.substring(0, 6)}...)
            </p>
            <p className="task-dex">
                <FaExchangeAlt className="task-icon" /> DEX: {campaign.dexName}
            </p>

            <div className="task-info-grid">
                <div className="info-item">
                    <span className="info-label">Volume/Loop:</span>
                    <span className="info-value">${campaign.volumePerLoopUSD}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Max Loops:</span>
                    <span className="info-value">{campaign.loopsPerUser}</span>
                </div>
            </div>

            <p className="task-earnings-total">
                <FaDollarSign className="task-icon large" /> **Earn up to ${totalEstimatedEarnings}**
            </p>
            <p className="task-status">Status: <span className={`status-${campaign.status.toLowerCase()}`}>{campaign.status}</span></p>

            <Link to={`/boostvolume/${campaign.id}`} className="join-task-button">
                Join Task
            </Link>
        </div>
    );
};

export default TaskCard;