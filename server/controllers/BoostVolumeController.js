
const BoostVolumeCampaign = require('../models/BoostVolumeCampaign');
const BoostVolumeParticipation = require('../models/BoostVolumeParticipation');
const User = require('../models/User'); // Link to your existing User model

const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const BoostVolumeController = {
    /**
     * Creates a new BoostVolume campaign.
     * POST /api/boost-volume/campaigns
     * (Requires authentication to get `req.user.id`)
     */
    async createCampaign(req, res) {
        const {
            campaignName, tokenAddress, selectedDEX, targetVolume,
            volumePerLoop, loopsPerUser, speed, notes,

            estimatedTotalCost,
            estimatedUserPayouts,
            estimatedPlatformProfit,
            totalCampaignLoops, // This is what the frontend calls 'numberOfLoops'
            usersNeeded
        } = req.body;


        const createdBy = req.user.id;


        if (!campaignName || !tokenAddress || !selectedDEX || !targetVolume ||
            !volumePerLoop || !loopsPerUser || !speed || !createdBy ||
            estimatedTotalCost === undefined || estimatedUserPayouts === undefined ||
            estimatedPlatformProfit === undefined || totalCampaignLoops === undefined || usersNeeded === undefined) {
            return res.status(400).json({ message: 'Missing required campaign fields or user not authenticated, or missing calculated costs from frontend.' });
        }

        try {











            const newCampaign = new BoostVolumeCampaign({
                campaignName,
                tokenAddress,
                selectedDEX,
                speed,
                notes,
                targetVolume: Number(targetVolume),       // Ensure numbers are stored as numbers
                volumePerLoop: Number(volumePerLoop),
                loopsPerUser: Number(loopsPerUser),
                

                totalCampaignLoops: Number(totalCampaignLoops), // Use the value from req.body
                usersNeeded: Number(usersNeeded),               // Use the value from req.body
                estimatedTotalCost: Number(estimatedTotalCost), // Use the value from req.body
                estimatedUserPayouts: Number(estimatedUserPayouts), // Use the value from req.body
                estimatedPlatformProfit: Number(estimatedPlatformProfit), // Use the value from req.body
                
                status: 'active', // Default status for a new campaign
                createdBy: createdBy,
            });

            await newCampaign.save();
            

            res.status(201).json({
                message: 'BoostVolume campaign created successfully!',
                campaignId: newCampaign._id,
                estimatedTotalCost: newCampaign.estimatedTotalCost,
                totalCampaignLoops: newCampaign.totalCampaignLoops
            });

        } catch (error) {
            console.error('Error creating BoostVolume campaign:', error);
            res.status(500).json({ message: 'Failed to create BoostVolume campaign.', error: error.message });
        }
    },

    /**
     * Fetches details of a specific BoostVolume campaign by its ID.
     * GET /api/boost-volume/campaigns/:id
     * (Requires authentication)
     */
    async getCampaignById(req, res) {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid campaign ID format.' });
        }

        try {
            const campaign = await BoostVolumeCampaign.findById(id);

            if (!campaign) {
                return res.status(404).json({ message: 'BoostVolume campaign not found.' });
            }

            res.status(200).json(campaign);

        } catch (error) {
            console.error('Error fetching BoostVolume campaign by ID:', error);
            res.status(500).json({ message: 'Failed to fetch BoostVolume campaign details.', error: error.message });
        }
    },

    /**
     * Fetches all BoostVolume campaigns created by a specific user (creator).
     * GET /api/boost-volume/creator/:creatorId
     * (Requires authentication, and ideally the `creatorId` in URL should match `req.user.id`)
     */
    async getCampaignsByCreatorId(req, res) {
        try {
            const { creatorId } = req.params;


            if (req.user.id !== creatorId) {
                return res.status(403).json({ message: 'Forbidden: You are not authorized to view these campaigns.' });
            }

            const campaigns = await BoostVolumeCampaign.find({ createdBy: creatorId })
                                                     .sort({ createdAt: -1 });

            if (!campaigns || campaigns.length === 0) {
                return res.status(200).json({ message: 'No volume boost campaigns found for this creator.', campaigns: [] });
            }

            res.status(200).json({
                message: 'Creator Boost Volume campaigns fetched successfully.',
                campaigns: campaigns
            });

        } catch (error) {
            console.error('Error fetching creator volume boost campaigns:', error);
            res.status(500).json({ message: 'Server error while fetching creator volume boost campaigns.', error: error.message });
        }
    },

    /**
     * Allows a user to associate their Solana wallet with a BoostVolume campaign.
     * POST /api/boost-volume/participate
     * (Requires authentication to get `req.user.id`)
     */
        async participateInCampaign(req, res) {
        const { campaignId, walletAddress } = req.body;
        const userId = req.user.id; // Ensure userId is correctly obtained from JWT

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ message: 'Invalid campaign ID format.' });
        }
        if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim().length === 0) {
            return res.status(400).json({ message: 'Wallet address is required.' });
        }
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required. User ID missing.' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const campaign = await BoostVolumeCampaign.findById(campaignId).session(session);
            if (!campaign) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'BoostVolume campaign not found.' });
            }
            if (campaign.status !== 'active') {
                await session.abortTransaction();
                return res.status(400).json({ message: 'This BoostVolume campaign is not active.' });
            }
            if (campaign.currentLoopsCompleted >= campaign.totalCampaignLoops) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'This BoostVolume campaign has already reached its target volume and is finished.' });
            }






            let participation = await BoostVolumeParticipation.findOne({ campaign: campaignId, user: userId }).session(session);

            if (participation) {

                if (participation.walletAddress !== walletAddress) {

                    participation.walletAddress = walletAddress;


                    await participation.save({ session });
                    
                    await session.commitTransaction(); // Commit here for wallet update
                    return res.status(200).json({
                        message: 'Your wallet address for this campaign has been updated!',
                        associatedWallet: walletAddress,
                        completedLoops: participation.verifiedLoops.length,
                        pendingLoops: participation.pendingLoops || 0,
                        maxLoopsForUser: campaign.loopsPerUser,
                        campaignStatus: campaign.status,
                        overallCampaignLoopsCompleted: campaign.currentLoopsCompleted,
                        overallCampaignTotalLoops: campaign.totalCampaignLoops,
                        overallCampaignUsersParticipating: campaign.currentParticipants,
                        overallCampaignUsersNeeded: campaign.usersNeeded
                    });
                } else {

                    await session.abortTransaction(); // No changes to commit, abort transaction
                    
                    return res.status(200).json({
                        message: 'You are already registered for this campaign with this wallet.',
                        associatedWallet: walletAddress,
                        completedLoops: participation.verifiedLoops.length,
                        pendingLoops: participation.pendingLoops || 0,
                        maxLoopsForUser: campaign.loopsPerUser,
                        campaignStatus: campaign.status,
                        overallCampaignLoopsCompleted: campaign.currentLoopsCompleted,
                        overallCampaignTotalLoops: campaign.totalCampaignLoops,
                        overallCampaignUsersParticipating: campaign.currentParticipants,
                        overallCampaignUsersNeeded: campaign.usersNeeded
                    });
                }
            } else {

                participation = new BoostVolumeParticipation({
                    campaign: campaignId,
                    user: userId,
                    walletAddress: walletAddress,
                    verifiedLoops: [], // Explicitly initialize as empty array
                    pendingLoops: 0,   // Explicitly initialize to 0
                    totalEarned: 0,    // Explicitly initialize to 0
                    status: 'active'   // Set initial status
                });
                await participation.save({ session });


                campaign.currentParticipants = (campaign.currentParticipants || 0) + 1;
                await campaign.save({ session });

                await session.commitTransaction(); // Commit for new participation
                
                return res.status(201).json({ // Use 201 Created for a new resource
                    message: 'Your wallet address has been registered for this campaign!',
                    associatedWallet: walletAddress,
                    completedLoops: participation.verifiedLoops.length,
                    pendingLoops: participation.pendingLoops,
                    maxLoopsForUser: campaign.loopsPerUser,
                    campaignStatus: campaign.status,
                    overallCampaignLoopsCompleted: campaign.currentLoopsCompleted,
                    overallCampaignTotalLoops: campaign.totalCampaignLoops,
                    overallCampaignUsersParticipating: campaign.currentParticipants,
                    overallCampaignUsersNeeded: campaign.usersNeeded
                });
            }

        } catch (error) {
            await session.abortTransaction();
            console.error('Error in BoostVolume participation:', error);

            if (error.code === 11000 && error.keyPattern && error.keyPattern.campaign === 1 && error.keyPattern.user === 1) {


                return res.status(409).json({ message: 'You are already registered for this campaign. If you need to change your wallet, update it using the provided input field.', error: error.message });
            }
            res.status(500).json({ message: 'Failed to participate in BoostVolume campaign.', error: error.message });
        } finally {
            session.endSession();
        }
    },

    /**
     * Endpoint for user to signal they've performed a loop.
     * This now simply updates a 'pending' count, for manual admin review.
     * POST /api/boost-volume/mark-done
     * (Requires authentication)
     */
    async markLoopAsDone(req, res) {
        const { campaignId, walletAddress } = req.body;
        const userId = req.user.id;

        if (!campaignId || !walletAddress || !userId) {
            return res.status(400).json({ message: 'Missing campaign ID, user ID, or wallet address. Ensure you are logged in.' });
        }

        try {
            const campaign = await BoostVolumeCampaign.findById(campaignId);
            if (!campaign) {
                return res.status(404).json({ message: 'BoostVolume campaign not found.' });
            }
            if (campaign.status !== 'active') {
                return res.status(400).json({ message: 'This BoostVolume campaign is not active or has finished.' });
            }
            if (campaign.currentLoopsCompleted >= campaign.totalCampaignLoops) {
                return res.status(400).json({ message: 'The BoostVolume campaign has reached its target volume and is finished.' });
            }

            const participation = await BoostVolumeParticipation.findOne({ campaign: campaignId, user: userId });
            if (!participation) {
                return res.status(400).json({ message: 'You are not participating in this BoostVolume campaign. Please join first.' });
            }
            if (participation.walletAddress !== walletAddress) {
                return res.status(403).json({ message: 'Provided wallet address does not match your registered wallet for this campaign.' });
            }

            const totalUserSubmittedLoops = participation.verifiedLoops.length + (participation.pendingLoops || 0);
            if (totalUserSubmittedLoops >= campaign.loopsPerUser) {
                return res.status(400).json({ message: 'You have completed or submitted all allowed BoostVolume loops for this campaign.' });
            }


            participation.pendingLoops = (participation.pendingLoops || 0) + 1;
            await participation.save();


            const updatedCampaign = await BoostVolumeCampaign.findById(campaignId);
            const updatedParticipation = await BoostVolumeParticipation.findOne({ campaign: campaignId, user: userId });


            


            res.status(200).json({
                message: 'Your loop submission has been recorded for manual verification. An admin will review it shortly!',
                completedLoops: updatedParticipation ? updatedParticipation.verifiedLoops.length : 0, // Verified loops
                pendingLoops: updatedParticipation ? updatedParticipation.pendingLoops : 0,           // Pending loops
                maxLoopsForUser: campaign.loopsPerUser,
                overallCampaignLoopsCompleted: updatedCampaign.currentLoopsCompleted,
                overallCampaignTotalLoops: updatedCampaign.totalCampaignLoops,
                campaignStatus: updatedCampaign.status
            });

        } catch (error) {
            console.error('Error marking BoostVolume loop as done:', error);
            res.status(500).json({ message: 'Failed to process your request.', error: error.message });
        }
    },



    async adminVerifyLoop(req, res) {
    const { participationId } = req.params; // ID of the specific BoostVolumeParticipation document
    const { providedSignature, loopProof } = req.body; // Optional: admin can provide a signature (e.g., tx hash) and original proof link

    if (!mongoose.Types.ObjectId.isValid(participationId)) {
        return res.status(400).json({ message: 'Invalid participation ID format.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const participation = await BoostVolumeParticipation.findById(participationId).session(session);
        if (!participation) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'BoostVolumeParticipation not found.' });
        }

        if (participation.pendingLoops <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'No pending loops to verify for this participation.' });
        }


        const campaign = await Campaign.findById(participation.campaign).session(session);
        if (!campaign) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Associated campaign not found.' });
        }


        participation.pendingLoops -= 1;
        participation.completedLoops += 1;


        const finalSignature = providedSignature || `admin-verified-${uuidv4()}`;


        participation.verifiedLoops.push({
            loopNumber: participation.verifiedLoops.length + 1, // Simple incremental loop number
            verifiedAt: new Date(),
            signature: finalSignature,
            volumeAchieved: campaign.volumePerLoopUSD, // Assuming constant volume per loop
            rewardAmount: campaign.payoutPerLoopUSD,
            proof: loopProof // Store the proof link/details
        });


        campaign.currentLoopsCompleted += 1;




        const user = await User.findById(participation.user).session(session);
        if (user) {
            user.totalEarned += campaign.payoutPerLoopUSD;
            await user.save({ session });
        }

        await participation.save({ session });
        await campaign.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            message: 'Loop verified successfully!',
            userParticipation: participation, // Send back updated participation
            campaignStatus: campaign.status, // Send back updated campaign status
            currentLoopsCompleted: campaign.currentLoopsCompleted,
            userTotalEarned: user ? user.totalEarned : undefined // If you update user's totalEarned
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error verifying BoostVolume loop:', error);
        res.status(500).json({ message: 'Failed to verify loop.', error: error.message });
    } finally {
        session.endSession();
    }
    },

    async getAllActiveCampaigns(req, res) {
        try {
            const campaigns = await BoostVolumeCampaign.find({ status: 'active' });

            const formattedCampaigns = campaigns.map(campaign => {
                let payoutPerLoopUSD = 0;
                if (typeof campaign.estimatedUserPayouts === 'number' && typeof campaign.totalCampaignLoops === 'number' && campaign.totalCampaignLoops > 0) {

                    payoutPerLoopUSD = campaign.estimatedUserPayouts / campaign.totalCampaignLoops; 
                } else {
                    console.warn(`[getAllActiveCampaigns] Cannot accurately calculate payoutPerLoopUSD for campaign ${campaign._id}. estimatedUserPayouts: ${campaign.estimatedUserPayouts}, totalCampaignLoops: ${campaign.totalCampaignLoops}`);
                }

                return {
                    id: campaign._id,
                    name: campaign.campaignName,
                    tokenSymbol: 'SOL',
                    tokenAddress: campaign.tokenAddress,
                    dexName: campaign.selectedDEX,
                    dexLink: `https://jup.ag/swap/SOL-${campaign.tokenAddress}`,
                    volumePerLoopUSD: campaign.volumePerLoop,
                    loopsPerUser: campaign.loopsPerUser,
                    quoteTokenSymbol: "SOL",
                    payoutPerLoopUSD: payoutPerLoopUSD, // Now it will be a number
                    status: campaign.status,
                    imageUrl: `https://via.placeholder.com/60/${Math.floor(Math.random()*16777215).toString(16)}/000000?text=${campaign.campaignName.substring(0,4).toUpperCase()}`,
                };
            });

            res.status(200).json(formattedCampaigns);
        } catch (error) {
            console.error('Error fetching active BoostVolume campaigns:', error);
            res.status(500).json({ message: 'Failed to fetch active campaigns.' });
        }
    },

    async getCampaignStatus(req, res) {
        const { campaignId } = req.params;
        const userId = req.user.id;

        

        if (!campaignId) {
            console.error('[getCampaignStatus] Error: Missing campaign ID.');
            return res.status(400).json({ message: 'Missing campaign ID.' });
        }
        if (!userId) {
            console.error('[getCampaignStatus] Error: Authentication required to fetch user-specific campaign status (userId missing from req.user).');
            return res.status(401).json({ message: 'Authentication required to fetch user-specific campaign status.' });
        }
        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            console.error(`[getCampaignStatus] Error: Invalid campaign ID format: ${campaignId}`);
            return res.status(400).json({ message: 'Invalid campaign ID format.' });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
             console.error(`[getCampaignStatus] Error: Invalid user ID format from authentication: ${userId}`);
             return res.status(400).json({ message: 'Invalid user ID format from authentication.' });
        }

        try {
            const campaign = await BoostVolumeCampaign.findById(campaignId);
            if (!campaign) {
                console.warn(`[getCampaignStatus] Campaign not found for ID: ${campaignId}`);
                return res.status(404).json({ message: 'BoostVolume campaign not found.' });
            }
            

            let userProgress = {
                associatedWallet: null,
                completedLoops: 0, // Represents verified loops
                pendingLoops: 0,   // Represents loops awaiting verification
                userParticipationStatus: 'not_started'
            };

            const participation = await BoostVolumeParticipation.findOne({ campaign: campaignId, user: userId });
            if (participation) {
                userProgress = {
                    associatedWallet: participation.walletAddress,
                    completedLoops: participation.verifiedLoops.length,
                    pendingLoops: participation.pendingLoops || 0,
                    userParticipationStatus: participation.status
                };
                
            } else {
                
            }


            let payoutPerLoopUSD = 0;
            if (typeof campaign.estimatedUserPayouts === 'number' && typeof campaign.totalCampaignLoops === 'number' && campaign.totalCampaignLoops > 0) {

                 payoutPerLoopUSD = campaign.estimatedUserPayouts / campaign.totalCampaignLoops; 
            } else {
                console.warn(`[getCampaignStatus] Cannot accurately calculate payoutPerLoopUSD. estimatedUserPayouts: ${campaign.estimatedUserPayouts}, totalCampaignLoops: ${campaign.totalCampaignLoops}`);
                payoutPerLoopUSD = 0;
            }

            res.status(200).json({
                campaignDetails: {
                    campaignId: campaign._id,
                    campaignName: campaign.campaignName,
                    tokenAddress: campaign.tokenAddress,
                    dexName: campaign.selectedDEX,
                    volumePerLoopUSD: typeof campaign.volumePerLoop === 'number' ? campaign.volumePerLoop : 0,
                    loopsPerUser: typeof campaign.loopsPerUser === 'number' ? campaign.loopsPerUser : 0,
                    targetVolumeUSD: typeof campaign.targetVolume === 'number' ? campaign.targetVolume : 0,
                    totalCampaignLoops: typeof campaign.totalCampaignLoops === 'number' ? campaign.totalCampaignLoops : 0,
                    overallCampaignUsersNeeded: typeof campaign.usersNeeded === 'number' ? campaign.usersNeeded : 0,
                    payoutPerLoopUSD: payoutPerLoopUSD, // This will now be a number
                    status: campaign.status,
                    currentLoopsCompleted: typeof campaign.currentLoopsCompleted === 'number' ? campaign.currentLoopsCompleted : 0,
                    currentParticipants: typeof campaign.currentParticipants === 'number' ? campaign.currentParticipants : 0
                },
                userProgress: userProgress
            });

        } catch (error) {
            console.error(`[getCampaignStatus] Critical Error fetching BoostVolume campaign status for campaign ${campaignId} and user ${userId}:`, error.message);
            console.error(error.stack);
            res.status(500).json({ message: 'Failed to fetch BoostVolume campaign status.', error: error.message });
        }
    }
};

module.exports = BoostVolumeController;