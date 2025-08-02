
const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authenticateJWT');
const db = require('../services/db'); // Your database service
const { DripCampaign, Task, User } = require('../services/db'); // Destructure models from db service
const Payment = require('../models/Payment');


const DRIP_PACKAGES = [
    { id: 'ignition', name: 'Ignition Drip', durationHours: 12, priceUSD: 1199, description: '...' },
    { id: 'boost', name: 'Boost Drip', durationHours: 24, priceUSD: 1999, description: '...' },
    { id: 'surge', name: 'Surge Drip', durationHours: 48, priceUSD: 3499, description: '...' },
];


const getTweetIdFromLink = (link) => {
    const match = link.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
};


router.post('/create-drip', authorize, async (req, res) => {
    const { packageId, initialTweetLink } = req.body;
    const creatorId = req.user.id;

    const selectedPackage = DRIP_PACKAGES.find(p => p.id === packageId);
    if (!selectedPackage) {
        return res.status(400).json({ message: 'Invalid drip package selected.' });
    }

    if (!initialTweetLink || !getTweetIdFromLink(initialTweetLink)) {
        return res.status(400).json({ message: 'A valid initial tweet link is required to start the drip.' });
    }

    try {
        const creator = await User.findById(creatorId);
        if (!creator) {
            return res.status(404).json({ message: 'Creator not found.' });
        }

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + selectedPackage.durationHours * 60 * 60 * 1000);

        const newDripCampaignData = {
            creator_id: creatorId,
            package_id: selectedPackage.id,
            start_time: startTime,
            end_time: endTime,
            status: 'pending_payment', // Changed to pending_payment for payment flow
            total_budget_usd: selectedPackage.priceUSD,
            tweet_links: [{ url: initialTweetLink }],
            total_engagements_target: Math.round(selectedPackage.priceUSD * 50),
            current_engagements_count: 0,
            engagements_by_type: { likes: 0, retweets: 0, comments: 0 }
        };

        const createdCampaign = await db.createDripCampaign(newDripCampaignData);

        // Don't generate tasks yet - wait for payment verification
        // await generateTasksForTweet(createdCampaign._id, initialTweetLink, creator);

        res.status(201).json({
            message: 'Drip campaign created successfully! Please complete payment to activate.',
            dripCampaign: {
                id: createdCampaign._id,
                package: selectedPackage.name,
                startTime: startTime,
                endTime: endTime,
                totalBudgetUSD: selectedPackage.priceUSD,
                initialTweet: initialTweetLink,
                status: createdCampaign.status,
            },
            requiresPayment: true
        });

    } catch (error) {
        console.error('Backend: Error creating drip campaign:', error);
        res.status(500).json({ message: 'Failed to create drip campaign due to a server error.' });
    }
});


// Payment verification endpoint for Drip Campaigns
router.post('/verify-payment', authorize, async (req, res) => {
    const { campaignId, transactionHash, solAmount } = req.body;
    const creatorId = req.user.id;

    if (!campaignId || !transactionHash || !solAmount) {
        return res.status(400).json({ message: 'Missing required payment verification data.' });
    }

    try {
        // Find the campaign
        const campaign = await db.findDripCampaignById(campaignId);
        
        if (!campaign) {
            return res.status(404).json({ message: 'Drip Campaign not found.' });
        }

        if (campaign.creator_id.toString() !== creatorId) {
            return res.status(403).json({ message: 'Unauthorized: You do not own this campaign.' });
        }

        if (campaign.status !== 'pending_payment') {
            return res.status(400).json({ message: 'Campaign is not in pending payment status.' });
        }

        // Get creator info
        const creator = await User.findById(creatorId);
        if (!creator) {
            return res.status(404).json({ message: 'Creator not found.' });
        }

        // Create payment verification request
        const paymentRequest = new Payment({
            campaignId: campaign._id,
            campaignModel: 'DripCampaign',
            campaignType: 'drip',
            creatorId: creator._id,
            creatorName: creator.username || creator.name,
            campaignName: `Drip Campaign - ${campaign.package_id}`,
            amount: solAmount,
            transactionHash: transactionHash,
            solanaAddress: "9iEVrZhfEMYr8u58MZgYhE2vpkgSSBc2t3RWBWArGjAR"
        });

        await paymentRequest.save();

        res.status(200).json({
            message: "Payment verification request submitted successfully! Awaiting admin review.",
            paymentId: paymentRequest._id
        });

    } catch (error) {
        console.error("Error submitting drip campaign payment verification:", error);
        res.status(500).json({ message: 'Failed to submit payment verification due to a server error.' });
    }
});

router.post('/:campaignId/add-tweet', authorize, async (req, res) => {
    const { campaignId } = req.params;
    const { tweetLink } = req.body;

    try {
        const campaign = await db.findDripCampaignById(campaignId);

        if (!campaign) {
            return res.status(404).json({ message: 'Drip Campaign not found.' });
        }

        if (campaign.creator_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: You do not own this campaign.' });
        }

        if (campaign.status !== 'active' || new Date() > new Date(campaign.end_time)) {
             return res.status(400).json({ message: `Cannot add tweets to a campaign that is not active or has ended. Current status: ${campaign.status}.` });
        }

        if (!tweetLink || !getTweetIdFromLink(tweetLink)) {
            return res.status(400).json({ message: 'A valid tweet link is required.' });
        }

        const updatedCampaign = await db.addTweetLinkToDripCampaign(campaignId, tweetLink);

        const creator = await User.findById(req.user.id);
        if (!creator) {
            console.error("Creator not found for adding tweet tasks.");
        } else {

            await generateTasksForTweet(campaignId, tweetLink, creator);
        }

        res.status(200).json({
            message: 'Tweet link added to drip campaign successfully.',
            campaign: {
                id: updatedCampaign._id,
                currentTweetLinks: updatedCampaign.tweet_links.map(linkObj => linkObj.url),
                updatedAt: updatedCampaign.updatedAt
            }
        });

    } catch (error) {
        console.error('Backend: Error adding tweet to campaign:', error);
        res.status(500).json({ message: error.message || 'Failed to add tweet to drip campaign due to a server error.' });
    }
});


router.get('/:campaignId/status', authorize, async (req, res) => {
    const { campaignId } = req.params;

    try {
        const campaign = await db.findDripCampaignById(campaignId);

        if (!campaign) {
            return res.status(404).json({ message: 'Drip Campaign not found.' });
        }

        if (campaign.creator_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: You do not own this campaign.' });
        }

        const isEnded = new Date() > campaign.end_time;
        const currentStatus = isEnded ? 'completed' : campaign.status;

        res.status(200).json({
            id: campaign._id,
            package: DRIP_PACKAGES.find(p => p.id === campaign.package_id)?.name || campaign.package_id,
            status: currentStatus,
            startTime: campaign.start_time,
            endTime: campaign.end_time,
            totalBudgetUSD: campaign.total_budget_usd,
            currentTweetLinks: campaign.tweet_links.map(linkObj => linkObj.url),
            totalEngagementsTarget: campaign.total_engagements_target,
            currentEngagementsCount: campaign.current_engagements_count,
            engagementsByType: campaign.engagements_by_type,
            isCompleted: isEnded
        });

    } catch (error) {
        console.error('Backend: Error fetching campaign status:', error);
        res.status(500).json({ message: 'Failed to fetch campaign status due to a server error.' });
    }
});


router.get('/creator/:creatorId', authorize, async (req, res) => {
    const { creatorId } = req.params;

    if (req.user.id !== creatorId) {
        return res.status(403).json({ message: 'Unauthorized action.' });
    }

    try {
        const campaigns = await db.DripCampaign.find({ creator_id: creatorId }).sort({ createdAt: -1 });

        const formattedCampaigns = campaigns.map(campaign => {
            const isEnded = new Date() > campaign.end_time;
            const currentStatus = isEnded ? 'completed' : campaign.status;

            const selectedPackage = DRIP_PACKAGES.find(p => p.id === campaign.package_id);

            return {
                _id: campaign._id,
                id: campaign._id,
                packageName: selectedPackage?.name || campaign.package_id,
                priceUSD: selectedPackage?.priceUSD || campaign.total_budget_usd,
                durationHours: selectedPackage?.durationHours || null,
                initialTweetLink: campaign.tweet_links[0]?.url,
                tweets: campaign.tweet_links.map(linkObj => linkObj.url),
                status: currentStatus,
                currentEngagementsCount: campaign.current_engagements_count,
                engagementsByType: campaign.engagements_by_type,
                isCompleted: isEnded,
                createdAt: campaign.createdAt
            };
        });

        res.status(200).json({ campaigns: formattedCampaigns });

    } catch (error) {
        console.error('Backend: Error fetching creator campaigns:', error);
        res.status(500).json({ message: 'Failed to fetch creator campaigns due to a server error.' });
    }
});


const generateTasksForTweet = async (dripCampaignId, tweetLink, creator) => {
    

    const tweetId = getTweetIdFromLink(tweetLink);
    if (!tweetId) {
        console.error(`[TaskGen] Invalid tweet link provided: ${tweetLink}`);
        return;
    }

    const fixedEarningAmount = 0.069; // The total earning for completing all actions for this task

    try {

        let existingTask = await Task.findOne({
            dripCampaign: dripCampaignId,
            tweetId: tweetId,
            actionType: 'combined'
        });

        if (existingTask) {
            console.warn(`[TaskGen] Combined task for tweet ${tweetLink} already exists in campaign ${dripCampaignId}. Skipping creation.`);
            return existingTask; // Return the existing task if found
        }


        const newTask = new Task({
            dripCampaign: dripCampaignId,
            creatorId: creator._id,
            creatorName: creator.username,
            creatorLogo: creator.profilePictureUrl,
            tweetId: tweetId,
            tweetLink: tweetLink,
            actionType: 'combined', // This is now explicitly 'combined'
            earningAmount: fixedEarningAmount,
            participationCount: 0,
            status: 'active',
            completedBy: [] // Initialize with an empty array of completers
        });
        await newTask.save();
        
        return newTask; // Return the newly created task
    } catch (taskError) {
        console.error(`[TaskGen] Error creating combined task for ${tweetLink}:`, taskError);


        throw taskError; // Re-throw to indicate failure
    }
};

module.exports = router;