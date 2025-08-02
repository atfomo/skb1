const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authenticateJWT');
const Payment = require('../models/Payment');
const SparkCampaign = require('../models/SparkCampaign');
const DripCampaign = require('../models/DripCampaign');
const User = require('../models/User');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Admin privileges required.' });
    }
};

// Get all pending payments
router.get('/pending-payments', authorize, requireAdmin, async (req, res) => {
    try {
        const payments = await Payment.find({ status: 'pending' })
            .sort({ submittedAt: -1 })
            .populate('creatorId', 'username name email');

        res.status(200).json({
            success: true,
            payments: payments
        });
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pending payments.' 
        });
    }
});

// Approve payment
router.post('/approve-payment', authorize, requireAdmin, async (req, res) => {
    const session = await require('mongoose').startSession();
    session.startTransaction();

    try {
        const { paymentId, campaignType } = req.body;
        const adminId = req.user.id;

        if (!paymentId || !campaignType) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required parameters.' 
            });
        }

        // Find the payment
        const payment = await Payment.findById(paymentId).session(session);
        if (!payment) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false, 
                message: 'Payment not found.' 
            });
        }

        if (payment.status !== 'pending') {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false, 
                message: 'Payment is not in pending status.' 
            });
        }

        // Update payment status
        payment.status = 'approved';
        payment.reviewedAt = new Date();
        payment.reviewedBy = adminId;
        await payment.save({ session });

        // Activate the campaign based on type
        let campaign;
        if (campaignType === 'spark') {
            campaign = await SparkCampaign.findById(payment.campaignId).session(session);
            if (campaign) {
                campaign.status = 'active';
                campaign.paymentVerified = true;
                campaign.transactionHash = payment.transactionHash;
                campaign.paymentDate = new Date();
                await campaign.save({ session });
            }
        } else if (campaignType === 'drip') {
            campaign = await DripCampaign.findById(payment.campaignId).session(session);
            if (campaign) {
                campaign.status = 'active';
                campaign.paymentVerified = true;
                campaign.transactionHash = payment.transactionHash;
                campaign.paymentDate = new Date();
                await campaign.save({ session });

                // Generate tasks for drip campaign
                const creator = await User.findById(payment.creatorId).session(session);
                if (creator && campaign.tweet_links && campaign.tweet_links.length > 0) {
                    // Import the generateTasksForTweet function
                    const { generateTasksForTweet } = require('./dripCampaigns');
                    await generateTasksForTweet(campaign._id, campaign.tweet_links[0].url, creator);
                }
            }
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Payment approved and campaign activated successfully!',
            payment: payment
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error approving payment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to approve payment.' 
        });
    } finally {
        session.endSession();
    }
});

// Reject payment
router.post('/reject-payment', authorize, requireAdmin, async (req, res) => {
    try {
        const { paymentId, campaignType, reason } = req.body;
        const adminId = req.user.id;

        if (!paymentId || !campaignType) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required parameters.' 
            });
        }

        // Find the payment
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Payment not found.' 
            });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment is not in pending status.' 
            });
        }

        // Update payment status
        payment.status = 'rejected';
        payment.reviewedAt = new Date();
        payment.reviewedBy = adminId;
        payment.rejectionReason = reason || 'Payment verification failed';
        await payment.save();

        res.status(200).json({
            success: true,
            message: 'Payment rejected successfully!',
            payment: payment
        });

    } catch (error) {
        console.error('Error rejecting payment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reject payment.' 
        });
    }
});

module.exports = router; 