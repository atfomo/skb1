
const BoostVolumeCampaign = require('../models/BoostVolumeCampaign');
const BoostVolumeParticipation = require('../models/BoostVolumeParticipation');
const User = require('../models/User'); // Assuming User model is in backend/models/User.js
const mongoose = require('mongoose');

const AdminBoostVolumeController = {

    /**
     * Admin: Get all BoostVolume campaigns for review.
     * GET /api/admin/boost-volume/campaigns
     */
    async getAllCampaignsForAdmin(req, res) {
        try {
            const campaigns = await BoostVolumeCampaign.find({})
                .sort({ createdAt: -1 });
            res.status(200).json(campaigns);
        } catch (error) {
            console.error('Admin Error fetching all BoostVolume campaigns:', error);
            res.status(500).json({ message: 'Failed to fetch campaigns for admin.', error: error.message });
        }
    },

    /**
     * Admin: Get all participations for a specific BoostVolume campaign.
     * GET /api/admin/boost-volume/campaigns/:campaignId/participations
     */
    async getParticipationsForCampaign(req, res) {
        const { campaignId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ message: 'Invalid campaign ID format.' });
        }

        try {
            const campaign = await BoostVolumeCampaign.findById(campaignId);
            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found for participations.' });
            }

            const participations = await BoostVolumeParticipation.find({ campaign: campaignId })
                .populate('user', 'username email') // Populate user details for display
                .sort({ joinedAt: 1 });


            const participationsWithDerivedData = participations.map(p => {
                const participationObj = p.toObject({ getters: true }); // Use getters for any virtuals if you add them



                participationObj.maxLoopsForUser = campaign.loopsPerUser;
                


                return participationObj;
            });

            res.status(200).json(participationsWithDerivedData);
        } catch (error) {
            console.error('Admin Error fetching BoostVolume participations:', error);
            res.status(500).json({ message: 'Failed to fetch participations for admin.', error: error.message });
        }
    },

    /**
     * Admin: Verify a user's submitted loop for a BoostVolume campaign.
     * POST /api/admin/boost-volume/participations/:participationId/verify-loop
     * Body: { signature: "tx_signature_from_user" } (or whatever proof is submitted)
     */
    async verifyLoop(req, res) {
        const { participationId } = req.params;
        const { signature } = req.body;

        if (!mongoose.Types.ObjectId.isValid(participationId)) {
            return res.status(400).json({ message: 'Invalid participation ID format.' });
        }
        if (!signature || typeof signature !== 'string' || signature.trim().length === 0) {
            return res.status(400).json({ message: 'Transaction signature (proof) is required and must be a non-empty string for verification.' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const participation = await BoostVolumeParticipation.findById(participationId).session(session);
            if (!participation) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'BoostVolume participation not found.' });
            }

            const campaign = await BoostVolumeCampaign.findById(participation.campaign).session(session);
            if (!campaign) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'Associated BoostVolume campaign not found.' });
            }


            if (participation.pendingLoops <= 0) {
                await session.abortTransaction();
                return res.status(400).json({ message: `No pending loops to verify for this user. Current pending: ${participation.pendingLoops}.` });
            }


            const existingSignature = participation.verifiedLoops.find(vl => vl.signature === signature);
            if (existingSignature) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'This transaction signature has already been verified for this user in this campaign.' });
            }


            if (participation.verifiedLoops.length >= campaign.loopsPerUser) {
                await session.abortTransaction();
                return res.status(400).json({ message: `User has already reached the maximum allowed verified loops (${campaign.loopsPerUser}).` });
            }


            if (campaign.currentLoopsCompleted >= campaign.totalCampaignLoops) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'Campaign has reached its total loop target. No more loops can be verified for this campaign.' });
            }




            let payoutPerLoopUSD = 0;
            if (campaign.totalCampaignLoops > 0) {
                payoutPerLoopUSD = campaign.estimatedUserPayouts / campaign.totalCampaignLoops;
            } else {

                await session.abortTransaction();
                return res.status(500).json({ message: 'Campaign total loops is zero, cannot calculate payout per loop.' });
            }
            

            participation.pendingLoops -= 1;
            participation.verifiedLoops.push({
                signature: signature,
                verifiedAt: new Date(),
                rewardAmount: payoutPerLoopUSD
            });






            if (participation.pendingLoops === 0 && participation.verifiedLoops.length >= campaign.loopsPerUser) {
                participation.status = 'awaiting_payout'; // Ready for payout
                participation.completedAt = new Date(); // Mark when user completed their part
            } else if (participation.pendingLoops === 0 && participation.verifiedLoops.length < campaign.loopsPerUser) {



            }


            campaign.currentLoopsCompleted = (campaign.currentLoopsCompleted || 0) + 1;

            if (campaign.currentLoopsCompleted >= campaign.totalCampaignLoops) {
                campaign.status = 'completed'; // Campaign fully completed

            }

            await participation.save({ session });
            await campaign.save({ session });


            const user = await User.findById(participation.user).session(session);
            if (user) {
                user.earnings = (user.earnings || 0) + payoutPerLoopUSD;


                await user.save({ session });
            }



            await session.commitTransaction();


            const updatedParticipation = await BoostVolumeParticipation.findById(participationId)
                .populate('user', 'username email')
                .toObject({ getters: true }); // Ensure toObject with getters for the response

            res.status(200).json({
                message: 'Loop verified successfully.',
                participation: updatedParticipation,
                campaign: campaign.toObject({ getters: true })
            });

        } catch (error) {
            await session.abortTransaction();
            console.error('Admin Error verifying BoostVolume loop:', error);
            res.status(500).json({ message: 'Failed to verify loop.', error: error.message });
        } finally {
            session.endSession();
        }
    },

    /**
     * Admin: Mark a user's participation as paid. (This would be after actual crypto payout)
     * POST /api/admin/boost-volume/participations/:participationId/mark-paid
     * Body: { transactionId: "solana_tx_id" }
     */
    async markPaid(req, res) {
        const { participationId } = req.params;
        const { transactionId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(participationId)) {
            return res.status(400).json({ message: 'Invalid participation ID format.' });
        }
        if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length === 0) {
            return res.status(400).json({ message: 'Transaction ID is required and must be a non-empty string to mark as paid.' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const participation = await BoostVolumeParticipation.findById(participationId).session(session);
            if (!participation) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'BoostVolume participation not found.' });
            }

            if (participation.status !== 'awaiting_payout') {
                await session.abortTransaction();
                return res.status(400).json({ message: `Participation is in "${participation.status}" status. It must be "awaiting_payout" to be marked as paid.` });
            }
            

            if (participation.payoutTxId === transactionId) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'This transaction ID has already been recorded for this payout.' });
            }



            const user = await User.findById(participation.user).session(session);
            if (!user) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'Associated user not found for payout.' });
            }

            user.earnings = (user.earnings || 0) + participation.totalEarned;




            await user.save({ session });


            participation.status = 'paid';
            participation.paidAt = new Date();
            participation.payoutTxId = transactionId; // Store the payout transaction ID

            await participation.save({ session });
            await session.commitTransaction();


            const updatedParticipation = await BoostVolumeParticipation.findById(participationId)
                .populate('user', 'username email')
                .toObject({ getters: true });

            res.status(200).json({
                message: 'Participation marked as paid.',
                participation: updatedParticipation
            });

        } catch (error) {
            await session.abortTransaction();
            console.error('Admin Error marking BoostVolume participation as paid:', error);
            res.status(500).json({ message: 'Failed to mark participation as paid.', error: error.message });
        } finally {
            session.endSession();
        }
    },

    /**
     * Admin: Reject a user's submitted loop for a BoostVolume campaign.
     * POST /api/admin/boost-volume/participations/:participationId/reject-loop
     * Body: { reason: "Why the loop was rejected" }
     */
    async rejectLoop(req, res) {
        const { participationId } = req.params;
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(participationId)) {
            return res.status(400).json({ message: 'Invalid participation ID format.' });
        }
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return res.status(400).json({ message: 'Rejection reason is required and must be a non-empty string.' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const participation = await BoostVolumeParticipation.findById(participationId).session(session);
            if (!participation) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'BoostVolume participation not found.' });
            }

            if (participation.pendingLoops <= 0) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'No pending loops to reject for this user.' });
            }
            

            participation.pendingLoops -= 1;
            

            participation.rejectedLoops.push({
                rejectedAt: new Date(),
                reason: reason
            });






            if (participation.pendingLoops === 0 && participation.verifiedLoops.length < campaign.loopsPerUser) {




            }

            await participation.save({ session });
            await session.commitTransaction();


            const updatedParticipation = await BoostVolumeParticipation.findById(participationId)
                .populate('user', 'username email')
                .toObject({ getters: true });

            res.status(200).json({
                message: 'Loop rejected successfully. Pending count reduced.',
                participation: updatedParticipation
            });

        } catch (error) {
            await session.abortTransaction();
            console.error('Admin Error rejecting BoostVolume loop:', error);
            res.status(500).json({ message: 'Failed to reject loop.', error: error.message });
        } finally {
            session.endSession();
        }
    }
};

module.exports = AdminBoostVolumeController;