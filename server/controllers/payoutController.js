// backend/controllers/payoutController.js
const PayoutRequest = require('../models/PayoutRequest');
const User = require('../models/User');

// --- Existing requestPayout function (keep as is) ---
exports.requestPayout = async (req, res) => {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const userId = req.user.id;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' });
    }

    try {
        const payoutAmountNum = parseFloat(amount);
        if (isNaN(payoutAmountNum) || payoutAmountNum < 50) {
            return res.status(400).json({ message: 'Invalid payout amount. Minimum is $50.' });
        }

        if (paymentMethod !== 'crypto') {
            return res.status(400).json({ message: "Invalid payment method. Only 'crypto' is supported." });
        }
        if (!paymentDetails || typeof paymentDetails !== 'object' || !paymentDetails.address || typeof paymentDetails.address !== 'string' || paymentDetails.address.trim() === '') {
            return res.status(400).json({ message: 'Crypto wallet address is required in payment details.' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user.accountStatus === 'banned') {
            return res.status(403).json({ message: 'Banned accounts cannot request payouts.' });
        }

        if (!user.walletAddress || user.walletAddress.trim() === '') {
            return res.status(400).json({ message: 'Please ensure your primary wallet address is set in your profile as well.' });
        }

        if (user.pendingEarnings < payoutAmountNum) {
            return res.status(400).json({ message: `Requested amount exceeds your available pending earnings.` });
        }

        const existingPendingRequest = await PayoutRequest.findOne({
            userId: userId,
            status: 'pending'
        });

        if (existingPendingRequest) {
            return res.status(400).json({ message: 'You already have a pending payout request. Please wait for it to be processed.' });
        }

        const newPayoutRequest = new PayoutRequest({
            userId: userId,
            amount: payoutAmountNum,
            status: 'pending',
            currency: 'USD',
            paymentMethod: 'crypto',
            paymentDetails: paymentDetails
        });

        await newPayoutRequest.save();

        user.pendingEarnings -= payoutAmountNum;
        user.reputationScore = (user.reputationScore || 0) + 10;
        user.totalPayoutsRequested = (user.totalPayoutsRequested || 0) + payoutAmountNum; // Ensure this is updated
        await user.save();

        res.status(200).json({
            message: 'Payout request submitted successfully!',
            payoutRequest: newPayoutRequest,
            newPendingEarnings: user.pendingEarnings,
            newReputationScore: user.reputationScore
        });

    } catch (error) {
        console.error("Error submitting payout request:", error);
        res.status(500).json({ message: "Server error submitting payout request." });
    }
};


// ⭐ NEW: Admin function to get all payout requests ⭐
exports.getAllPayoutRequests = async (req, res) => {
    try {
        const payoutRequests = await PayoutRequest.find()
            .populate('userId', 'username email telegramUsername earnings pendingEarnings')
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Payout requests fetched successfully!",
            payoutRequests
        });
    } catch (error) {
        console.error("Error fetching all payout requests:", error);
        res.status(500).json({ message: "Server error fetching payout requests." });
    }
};

// ⭐ NEW: Admin function to update payout request status ⭐
exports.updatePayoutStatus = async (req, res) => {
    const { status, adminNotes } = req.body;
    const payoutRequestId = req.params.id;
    const adminUserId = req.user.id; // ID of the admin performing the action

    if (!status || !['pending', 'approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status provided." });
    }

    try {
        const payoutRequest = await PayoutRequest.findById(payoutRequestId);

        if (!payoutRequest) {
            return res.status(404).json({ message: "Payout request not found." });
        }

        if (payoutRequest.status === 'completed' || payoutRequest.status === 'rejected') {
            return res.status(400).json({ message: `Cannot change status of an ${payoutRequest.status} request.` });
        }

        payoutRequest.status = status;
        payoutRequest.adminNotes = adminNotes || '';
        payoutRequest.processedBy = adminUserId;
        payoutRequest.processedAt = new Date();

        if (status === 'rejected') {
            const user = await User.findById(payoutRequest.userId);
            if (user) {
                user.pendingEarnings = (user.pendingEarnings || 0) + payoutRequest.amount;
                await user.save();
                console.log(`[PayoutController] Rejected payout ${payoutRequestId}. Amount $${payoutRequest.amount} returned to user ${user._id}'s pending earnings.`);
            } else {
                console.warn(`[PayoutController] User ${payoutRequest.userId} not found for rejected payout ${payoutRequestId}. Amount not returned.`);
            }
        }

        await payoutRequest.save();

        console.log(`[PayoutController] Payout request ${payoutRequestId} status updated to: ${status} by admin ${adminUserId}.`);

        res.status(200).json({
            message: `Payout request status updated to '${status}'.`,
            payoutRequest
        });

    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: "Invalid Payout Request ID format." });
        }
        console.error("Error updating payout request status:", error);
        res.status(500).json({ message: "Server error updating payout request status." });
    }
};