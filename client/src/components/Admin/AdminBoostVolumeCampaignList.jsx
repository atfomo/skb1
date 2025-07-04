
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminCampaigns } from '../../api/adminApi';

function AdminBoostVolumeCampaignList() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadCampaigns = async () => {
            try {
                const data = await fetchAdminCampaigns();
                setCampaigns(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadCampaigns();
    }, []);

    if (loading) return <div>Loading Boost Volume Campaigns...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h1>Boost Volume Campaigns (Admin)</h1>
            <table>
                <thead>
                    <tr>
                        <th>Campaign Name</th>
                        <th>Status</th>
                        <th>Target Volume</th>
                        <th>Loops Completed</th>
                        <th>Participants</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map(campaign => (
                        <tr key={campaign._id}>
                            <td>{campaign.campaignName}</td>
                            <td>{campaign.status}</td>
                            <td>{campaign.targetVolume}</td>
                            <td>{campaign.currentLoopsCompleted}/{campaign.totalCampaignLoops}</td>
                            <td>{campaign.currentParticipants}/{campaign.usersNeeded}</td>
                            <td>
                                <button onClick={() => navigate(`/admin/boost-volume/campaigns/${campaign._id}`)}>
                                    View Participations
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminBoostVolumeCampaignList;