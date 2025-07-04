
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAdminCampaigns, fetchAdminCampaignParticipations, verifyUserLoop, markUserPaid } from '../../api/adminApi';

function AdminBoostVolumeCampaignDetail() {
    const { campaignId } = useParams();
    const [campaign, setCampaign] = useState(null);
    const [participations, setParticipations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [signatureInput, setSignatureInput] = useState({}); // To hold signature for each user
    const [txIdInput, setTxIdInput] = useState({}); // To hold transaction ID for payouts

    const loadData = async () => {
        try {
            const campaignData = (await fetchAdminCampaigns()).find(c => c._id === campaignId);
            if (!campaignData) {
                setError("Campaign not found.");
                return;
            }
            setCampaign(campaignData);
            const participationsData = await fetchAdminCampaignParticipations(campaignId);
            setParticipations(participationsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [campaignId]);

    const handleVerifyLoop = async (participationId) => {
        const signature = signatureInput[participationId];
        if (!signature) {
            alert("Please enter a transaction signature to verify.");
            return;
        }
        try {
            const result = await verifyUserLoop(participationId, signature);

            setParticipations(prev => prev.map(p =>
                p._id === participationId ? { ...p, ...result.participation } : p
            ));
            alert('Loop verified successfully! User earned: ' + result.participation.verifiedLoops[result.participation.verifiedLoops.length - 1].rewardAmount.toFixed(4) + ' USD');
            setSignatureInput(prev => ({ ...prev, [participationId]: '' })); // Clear input
        } catch (err) {
            alert('Error verifying loop: ' + err.message);
            console.error('Verification error:', err);
        }
    };

    const handleMarkPaid = async (participationId) => {
        const transactionId = txIdInput[participationId];
        if (!transactionId) {
            alert("Please enter a transaction ID to mark as paid.");
            return;
        }
        if (!window.confirm(`Are you sure you want to mark this participation as PAID with TX ID: ${transactionId}?`)) {
            return;
        }
        try {
            const result = await markUserPaid(participationId, transactionId);
            setParticipations(prev => prev.map(p =>
                p._id === participationId ? { ...p, ...result.participation } : p
            ));
            alert('Participation marked as paid!');
            setTxIdInput(prev => ({ ...prev, [participationId]: '' })); // Clear input
        } catch (err) {
            alert('Error marking as paid: ' + err.message);
            console.error('Mark paid error:', err);
        }
    };

    if (loading) return <div>Loading campaign details...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!campaign) return <div>Campaign not found.</div>;

    return (
        <div>
            <h1>Campaign: {campaign.campaignName}</h1>
            <p>Status: {campaign.status}</p>
            <p>Target Volume: {campaign.targetVolume} USD</p>
            <p>Volume per Loop: {campaign.volumePerLoop} USD</p>
            <p>Loops per User: {campaign.loopsPerUser}</p>
            <p>Total Campaign Loops: {campaign.totalCampaignLoops}</p>
            <p>Current Loops Completed: {campaign.currentLoopsCompleted}</p>
            <p>Estimated User Payouts: {campaign.estimatedUserPayouts} USD</p>
            <hr />

            <h2>Participating Users</h2>
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Wallet Address</th>
                        <th>Pending Loops</th>
                        <th>Verified Loops</th>
                        <th>Total Earned (USD)</th>
                        <th>User Status</th>
                        <th>Signature / TX ID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {participations.map(p => (
                        <tr key={p._id}>
                            <td>{p.user ? p.user.username : 'N/A'}</td>
                            <td>{p.walletAddress}</td>
                            <td>{p.pendingLoops}</td>
                            <td>
                                {p.verifiedLoops.length} / {p.maxLoopsForUser}
                                {p.verifiedLoops.length > 0 && (
                                    <ul>
                                        {p.verifiedLoops.map((v, idx) => (
                                            <li key={idx}>Loop {idx + 1}: {v.signature.substring(0, 8)}... - Earned: ${v.rewardAmount?.toFixed(4)}</li>
                                        ))}
                                    </ul>
                                )}
                            </td>
                            <td>${p.totalEarned?.toFixed(4)}</td> {}
                            <td>{p.status}</td>
                            <td>
                                {p.pendingLoops > 0 && p.status === 'active' && (
                                    <input
                                        type="text"
                                        placeholder="Tx Signature"
                                        value={signatureInput[p._id] || ''}
                                        onChange={(e) => setSignatureInput(prev => ({ ...prev, [p._id]: e.target.value }))}
                                    />
                                )}
                                {p.status === 'awaiting_payout' && (
                                    <input
                                        type="text"
                                        placeholder="Payout Tx ID"
                                        value={txIdInput[p._id] || ''}
                                        onChange={(e) => setTxIdInput(prev => ({ ...prev, [p._id]: e.target.value }))}
                                    />
                                )}
                            </td>
                            <td>
                                {p.pendingLoops > 0 && p.status === 'active' && (
                                    <button onClick={() => handleVerifyLoop(p._id)}>Verify Next Loop</button>
                                )}
                                {p.status === 'awaiting_payout' && (
                                    <button onClick={() => handleMarkPaid(p._id)}>Mark Paid</button>
                                )}
                                {}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminBoostVolumeCampaignDetail;