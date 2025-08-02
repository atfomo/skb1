import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { API_BASE_URL } from '../config';
import './AdminPaymentReviewPage.css';

const AdminPaymentReviewPage = () => {
    const { user, token, loadingUser } = useUser();
    const navigate = useNavigate();
    const [pendingPayments, setPendingPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (!loadingUser && (!user || !user._id || !token)) {
            navigate('/login');
            return;
        }

        if (user && user.role !== 'admin') {
            navigate('/');
            return;
        }

        fetchPendingPayments();
    }, [user, token, loadingUser, navigate]);

    const fetchPendingPayments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/admin/pending-payments`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setPendingPayments(response.data.payments);
        } catch (err) {
            console.error('Error fetching pending payments:', err);
            setError('Failed to load pending payments');
        } finally {
            setLoading(false);
        }
    };

    const handleApprovePayment = async (paymentId, campaignType) => {
        try {
            setProcessingId(paymentId);
            const response = await axios.post(`${API_BASE_URL}/api/admin/approve-payment`, {
                paymentId,
                campaignType
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                // Remove the approved payment from the list
                setPendingPayments(prev => prev.filter(payment => payment._id !== paymentId));
            }
        } catch (err) {
            console.error('Error approving payment:', err);
            setError('Failed to approve payment');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectPayment = async (paymentId, campaignType, reason) => {
        try {
            setProcessingId(paymentId);
            const response = await axios.post(`${API_BASE_URL}/api/admin/reject-payment`, {
                paymentId,
                campaignType,
                reason
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                // Remove the rejected payment from the list
                setPendingPayments(prev => prev.filter(payment => payment._id !== paymentId));
            }
        } catch (err) {
            console.error('Error rejecting payment:', err);
            setError('Failed to reject payment');
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getCampaignTypeLabel = (campaignType) => {
        switch (campaignType) {
            case 'spark':
                return 'Spark Campaign';
            case 'drip':
                return 'Drip Campaign';
            default:
                return campaignType;
        }
    };

    if (loadingUser) {
        return <div className="loading-message">Loading...</div>;
    }

    if (user?.role !== 'admin') {
        return <div className="error-message">Access denied. Admin privileges required.</div>;
    }

    return (
        <div className="admin-payment-review-container">
            <div className="page-header">
                <h1>Payment Review Dashboard</h1>
                <p>Review and approve pending campaign payments</p>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {loading ? (
                <div className="loading-message">Loading pending payments...</div>
            ) : (
                <div className="payments-section">
                    <h2>Pending Payments ({pendingPayments.length})</h2>
                    
                    {pendingPayments.length === 0 ? (
                        <div className="no-payments">
                            <p>No pending payments to review</p>
                        </div>
                    ) : (
                        <div className="payments-grid">
                            {pendingPayments.map((payment) => (
                                <div key={payment._id} className="payment-card">
                                    <div className="payment-header">
                                        <h3>{getCampaignTypeLabel(payment.campaignType)}</h3>
                                        <span className="payment-amount">${payment.amount} USD</span>
                                    </div>
                                    
                                    <div className="payment-details">
                                        <p><strong>Creator:</strong> {payment.creatorName}</p>
                                        <p><strong>Campaign:</strong> {payment.campaignName}</p>
                                        <p><strong>Transaction Hash:</strong> {payment.transactionHash}</p>
                                        <p><strong>Submitted:</strong> {formatDate(payment.submittedAt)}</p>
                                        <p><strong>Solana Address:</strong> {payment.solanaAddress}</p>
                                    </div>

                                    <div className="payment-actions">
                                        <button
                                            onClick={() => handleApprovePayment(payment._id, payment.campaignType)}
                                            className="approve-button"
                                            disabled={processingId === payment._id}
                                        >
                                            {processingId === payment._id ? 'Processing...' : 'Approve'}
                                        </button>
                                        <button
                                            onClick={() => handleRejectPayment(payment._id, payment.campaignType, 'Payment verification failed')}
                                            className="reject-button"
                                            disabled={processingId === payment._id}
                                        >
                                            {processingId === payment._id ? 'Processing...' : 'Reject'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminPaymentReviewPage; 