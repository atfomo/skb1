
import React from 'react';
import { Link } from 'react-router-dom';
import { FaTag } from 'react-icons/fa';
import './ProjectGrid.css'; // Import the CSS file

const ProjectGrid = ({ projects }) => {
    if (!projects || projects.length === 0) {
        return (
            <div className="project-grid-empty-state-message"> {}
                <p className="project-grid-empty-state-title">No campaigns found.</p> {}
                <p className="project-grid-empty-state-text">Try adjusting your search filters or create a new campaign!</p> {}
            </div>
        );
    }

    return (
        <div className="project-grid-container">
            {projects.map((campaign) => {

                const totalUsers = campaign.numberOfUsers || 0; // Ensure it's a number, default to 0
                const completedUsers = campaign.completedUsersCount || 0; // Ensure it's a number, default to 0

                let progressPercentage = 0;
                if (totalUsers > 0) {
                    progressPercentage = Math.min(100, (completedUsers / totalUsers) * 100);
                }
                progressPercentage = progressPercentage.toFixed(1); // Format to one decimal place


                let bannerImageUrl;
                if (campaign.image) {
                    if (campaign.image.startsWith('http://') || campaign.image.startsWith('https://')) {
                        bannerImageUrl = campaign.image;
                    } else {

                        bannerImageUrl = `https://atfomo-beta.onrender.com${campaign.image}`;
                    }
                } else {
                    bannerImageUrl = 'https://via.placeholder.com/300x600?text=Campaign+Banner'; // Placeholder for 300x600
                }

                return (

                    <Link
                        key={campaign._id}
                        to={`/campaign/${campaign._id}`}
                        className="project-card"

                    >
                        {}
                        <div className="project-card-background-overlay" style={{ backgroundImage: `url(${bannerImageUrl})` }}></div>

                        {}
                        <div className="project-header-top">
<img
    src={campaign.logo || 'https://via.placeholder.com/60x60?text=Logo'}
    alt={`${campaign.name} logo`}
    className="project-logo"
/>
                            <div className="project-info-text-top">
                                <h3 className="project-name-top">

                                </h3>
                                <div className="project-tags-top">
                                    {campaign.tags && campaign.tags.map((tag, tagIndex) => (
                                        <span
                                            key={tagIndex}
                                            className="project-tag"
                                        >
                                            <FaTag className="tag-icon" /> {tag}
                                        </span>
                                    ))}
                                    {campaign.earningTag && (
                                        <span className={`project-tag earning-tag-${campaign.earningTag.toLowerCase().replace(/\s/g, '-')}`}>
                                            <FaTag className="tag-icon" /> {campaign.earningTag}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {campaign.isNew && (
                                <span className="project-new-badge">NEW</span>
                            )}
                        </div>

                        {}
                        <div className="project-details-frosted-block">
                            {}
                            <div className="project-stats-block">
                                <div className="project-earnings">
                                    <p className="stats-label">Earn Per User</p>
                                    <p className="earnings-amount">${campaign.payoutPerUser ? campaign.payoutPerUser.toFixed(2) : '0.00'}</p>
                                </div>

                                <div className="project-tasks">
                                    <p className="stats-label">Active Tasks</p>
                                    <p className="tasks-count">{campaign.campaignTasks?.length || 0}</p>
                                </div>
                            </div>

                            {}
                            <div className="campaign-progress-bar-wrapper">
                                <div className="progress-bar-info">
                                    <span>Progress:</span>
                                    <span>{completedUsers} / {totalUsers} Users</span>
                                </div>
                                <div className="progress-bar-container-sleek">
                                    <div
                                        className="progress-bar-fill-sleek"
                                        style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                    <span className="progress-bar-text-sleek">{progressPercentage}%</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default ProjectGrid;