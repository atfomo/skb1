import React, { useState, useEffect } from 'react';
import { FaWallet, FaCopy, FaCheck, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import './PaymentModal.css';

const PaymentModal = ({ 
    isOpen, 
    onClose, 
    amount, 
    campaignName, 
    campaignData,
    onPaymentSuccess,
    solanaAddress = "9iEVrZhfEMYr8u58MZgYhE2vpkgSSBc2t3RWBWArGjAR" // Default Solana address
}) => {
    const [copied, setCopied] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed
    const [transactionHash, setTransactionHash] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setPaymentStatus('pending');
            setTransactionHash('');
            setCopied(false);
        }
    }, [isOpen]);

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handlePaymentVerification = async () => {
        setPaymentStatus('processing');
        
        try {
            const token = localStorage.getItem('jwtToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Simulate payment verification API call
            // In a real implementation, you would verify the transaction on Solana blockchain
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/spark-campaigns/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    campaignId: campaignData?.id,
                    transactionHash: 'simulated_transaction_hash',
                    solAmount: amount
                })
            });

            if (response.ok) {
                setPaymentStatus('success');
                setTimeout(() => {
                    onPaymentSuccess();
                    onClose();
                }, 2000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Payment verification failed');
            }
        } catch (error) {
            setPaymentStatus('failed');
            console.error('Payment verification failed:', error);
        }
    };

    const openSolanaExplorer = () => {
        window.open(`https://solscan.io/account/${solanaAddress}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="payment-modal-overlay">
            <div className="payment-modal">
                <div className="payment-modal-header">
                    <h2><FaWallet /> Payment Required</h2>
                    <button className="close-button" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="payment-modal-content">
                    <div className="payment-summary">
                        <h3>Campaign Payment</h3>
                        <div className="campaign-details">
                            <p><strong>Campaign:</strong> {campaignName}</p>
                            <p><strong>Amount:</strong> ${amount} USD</p>
                        </div>
                    </div>

                    <div className="payment-instructions">
                        <h4>Payment Instructions</h4>
                        <ol>
                            <li>Send exactly <strong>${amount} USD</strong> worth of SOL to the address below</li>
                            <li>Use the current SOL price for conversion</li>
                            <li>Include a memo with your campaign name for verification</li>
                            <li>Click "Verify Payment" after sending</li>
                        </ol>
                    </div>

                    <div className="solana-address-section">
                        <h4>Solana Address</h4>
                        <div className="address-container">
                            <div className="address-display">
                                <span className="address-text">{solanaAddress}</span>
                                <button 
                                    className="copy-button"
                                    onClick={() => copyToClipboard(solanaAddress)}
                                >
                                    {copied ? <FaCheck /> : <FaCopy />}
                                </button>
                            </div>
                            <button 
                                className="explorer-button"
                                onClick={openSolanaExplorer}
                            >
                                <FaExternalLinkAlt /> View on Explorer
                            </button>
                        </div>
                    </div>

                    <div className="payment-status">
                        {paymentStatus === 'pending' && (
                            <div className="status-pending">
                                <p>Waiting for payment...</p>
                            </div>
                        )}
                        
                        {paymentStatus === 'processing' && (
                            <div className="status-processing">
                                <div className="loading-spinner"></div>
                                <p>Verifying payment...</p>
                            </div>
                        )}
                        
                        {paymentStatus === 'success' && (
                            <div className="status-success">
                                <FaCheck />
                                <p>Payment verified! Creating campaign...</p>
                            </div>
                        )}
                        
                        {paymentStatus === 'failed' && (
                            <div className="status-failed">
                                <FaTimes />
                                <p>Payment verification failed. Please try again.</p>
                            </div>
                        )}
                    </div>

                    <div className="payment-actions">
                        {paymentStatus === 'pending' && (
                            <button 
                                className="verify-payment-button"
                                onClick={handlePaymentVerification}
                            >
                                Verify Payment
                            </button>
                        )}
                        
                        {paymentStatus === 'failed' && (
                            <button 
                                className="retry-button"
                                onClick={() => setPaymentStatus('pending')}
                            >
                                Try Again
                            </button>
                        )}
                        
                        <button 
                            className="cancel-button"
                            onClick={onClose}
                            disabled={paymentStatus === 'processing'}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal; 