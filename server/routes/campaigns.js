// routes/campaigns.js
const express = require('express');
const router = express.Router();
const { Campaign, UserParticipation } = require('../models/Campaign');
const User = require('../models/User'); // Assuming User model is in a separate file or exported distinctly
const Project = require('../models/Project'); // *** NEW: Import your Project/CreatorDashboard model ***
const authenticateJWT = require('../middleware/authenticateJWT');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../utils/cloudinaryConfig'); // Import your Cloudinary config
const uploadProof = require('../middleware/upload'); // Multer middleware for file uploads
const multer = require('multer'); // Import multer to catch Multer errors

// Configure Multer for in-memory storage, as Cloudinary handles the actual storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB file size limit for actual files
        // *** ADD THIS LINE FOR TEXT FIELD SIZE LIMIT ***
        fieldSize: 10 * 1024 * 1024 // 10 MB limit for text fields (e.g., base64 string)
                                   // Adjust this value as needed. 10MB is a good starting point for images.
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});


// --- IMPORTANT: Ensure these constants match your frontend values exactly ---
const PLATFORM_FEE_PERCENTAGE = 15;
const CUSTOM_TASK_MIN_RATE = 0.20; // This rate is used for filtering and validation

// --- GET all campaigns (PUBLIC) ---
router.get('/', async (req, res) => {
    try {
        // Populate the 'createdBy' field and select only the 'username'
        const campaigns = await Campaign.find({}).populate('createdBy', 'username');
        res.status(200).json(campaigns);
    } catch (err) {
        console.error("Error fetching campaigns:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// --- GET a single campaign by ID (PUBLIC) ---
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Populate the 'createdBy' field and select only the 'username'
        const campaign = await Campaign.findById(id).populate('createdBy', 'username');

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        res.status(200).json(campaign);
    } catch (err) {
        console.error(`Error fetching campaign with ID ${req.params.id}:`, err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: "Invalid campaign ID format." });
        }
        res.status(500).json({ message: "Internal server error" });
    }
});


// --- POST a new campaign ---
// ADD upload.none() middleware here to parse text fields from FormData
router.post('/', authenticateJWT, upload.none(), async (req, res) => {
    try {
        console.log("[Backend] Campaign POST - req.body received by Multer:", req.body); // Debug log

        const {
            name,
            description,
            budget,
            numberOfUsers,
            earningTag,
            campaignTasks,
            totalEngagementsExpected,
            estimatedTotalCampaignCost,
            rules,
            taskDetailsForExecution,
            socials,
            bannerImage
        } = req.body;

        // Parse JSON strings from formData
        const parsedCampaignTasks = typeof campaignTasks === 'string' ? JSON.parse(campaignTasks) : campaignTasks;
        const parsedRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
        const parsedTaskDetailsForExecution = typeof taskDetailsForExecution === 'string' ? JSON.parse(taskDetailsForExecution) : taskDetailsForExecution;
        const parsedSocials = typeof socials === 'string' ? JSON.parse(socials) : socials;


        console.log("BACKEND LOG: (Point 1) parsedCampaignTasks (from FormData string):", parsedCampaignTasks);
        if (parsedCampaignTasks.length > 0 && parsedCampaignTasks[0].links) {
            console.log("BACKEND LOG: (Point 1) First task's links array from parsed data:", parsedCampaignTasks[0].links);
            if (parsedCampaignTasks[0].links.length > 0) {
                console.log("BACKEND LOG: (Point 1) First link object in first task (from parsed data):", parsedCampaignTasks[0].links[0]);
            }
        }

        const {
            likeLinks = [], retweetLinks = [], commentLinks = [],
            joinDiscordLinks = [], joinTelegramLinks = [], followXLinks = [],
            customTaskDefinitions = []
        } = parsedTaskDetailsForExecution || {};

        // --- Server-side validation ---
        const parsedBudget = parseFloat(budget);
        const parsedNumberOfUsers = parseInt(numberOfUsers);

        if (isNaN(parsedBudget) || parsedBudget <= 0) {
            return res.status(400).json({ message: "Budget is required and must be a positive number." });
        }
        if (isNaN(parsedNumberOfUsers) || parsedNumberOfUsers <= 0) {
            return res.status(400).json({ message: "Number of users is required and must be a positive number." });
        }
        if (!parsedRules || !Array.isArray(parsedRules) || parsedRules.length === 0) {
            return res.status(400).json({ message: "Rules are required to create a campaign." });
        }
        if (!parsedCampaignTasks || !Array.isArray(parsedCampaignTasks) || parsedCampaignTasks.length === 0) {
            return res.status(400).json({ message: "Campaign must have at least one active task configured." });
        }

        const sumAllocations = parsedCampaignTasks.reduce((sum, task) => sum + (task.allocationPercentage || 0), 0);
        if (parsedCampaignTasks.length > 0 && (sumAllocations < 99.5 || sumAllocations > 100.5)) {
            return res.status(400).json({ message: `Total task allocation must be around 100% (currently ${sumAllocations.toFixed(1)}%). Please adjust.` });
        }

        // --- Handle image upload to Cloudinary ---
        let imageUrl = 'https://via.placeholder.com/600x400?text=Campaign'; // Default placeholder
        let imagePublicId = null;

        if (bannerImage) {
            try {
                const uploadResult = await cloudinary.uploader.upload(bannerImage, {
                    folder: 'campaign_banners',
                    resource_type: 'image',
                });
                imageUrl = uploadResult.secure_url;
                imagePublicId = uploadResult.public_id;
            } catch (uploadError) {
                console.error("Error uploading banner image to Cloudinary:", uploadError);
                return res.status(500).json({ message: "Failed to upload campaign banner image. " + uploadError.message });
            }
        } else {
            return res.status(400).json({ message: "Campaign banner image is required." });
        }

        // --- Calculate fields for ProjectGrid.jsx display ---
        let totalActiveTaskTypes = 0;
        let payoutPerUser = 0;

        const platformFee = (parsedBudget * PLATFORM_FEE_PERCENTAGE) / 100;
        const netBudget = parsedBudget - platformFee;

        let totalWeightedTaskValuesPerUser = 0;
        parsedCampaignTasks.forEach(task => {
            totalWeightedTaskValuesPerUser += (task.baseRate * task.instances);
        });

        let scalingFactor = 0;
        if (totalWeightedTaskValuesPerUser > 0) {
            if (req.body.payoutPerUser) {
                payoutPerUser = parseFloat(req.body.payoutPerUser);
            } else {
                payoutPerUser = netBudget / parsedNumberOfUsers;
            }
            scalingFactor = payoutPerUser / totalWeightedTaskValuesPerUser;
        }

        parsedCampaignTasks.forEach(task => {
            if (task.allocationPercentage > 0) {
                totalActiveTaskTypes++;
            }
            task.payoutPerInstance = task.baseRate * scalingFactor;
        });

        const processedCustomTasks = customTaskDefinitions.map(task => {
            const correspondingCampaignTask = parsedCampaignTasks.find(ct => ct.key === task.id);
            const allocation = correspondingCampaignTask ? correspondingCampaignTask.allocationPercentage : 0;

            const usersAllocatedToCustomTask = Math.round((allocation / 100) * parsedNumberOfUsers);

            return {
                id: task.id,
                name: task.name || `Custom Task ${task.id}`,
                rate: task.rate,
                description: task.description,
                users: usersAllocatedToCustomTask,
                totalCost: (task.rate * usersAllocatedToCustomTask) || 0,
            };
        }).filter(task => task.rate >= CUSTOM_TASK_MIN_RATE);


        const creatorId = String(req.user.id);
        const shortCreatorId = creatorId.length > 0 ? creatorId.substring(0, Math.min(creatorId.length, 4)) : '';

        const uniqueId = `campaign-${uuidv4()}-${shortCreatorId}`;

        const updatedCampaignTasks = parsedCampaignTasks.map(task => {
            let guideText = '';
            let guideLink = '';

            switch (task.key) {
                case 'x-like':
                case 'x-retweet':
                case 'x-comment':
                case 'x-follow':
                case 'telegram':
                case 'discord':
                case 'website':
                    break;
                default: // Custom tasks
                    const customTaskDef = customTaskDefinitions.find(cTask => String(cTask.id) === String(task.key));
                    if (customTaskDef) {
                        guideText = customTaskDef.description || '';
                        guideLink = customTaskDef.guideLink || '';
                    }
                    break;
            }

            const targetParticipantsForTask = Math.round((task.allocationPercentage / 100) * parsedNumberOfUsers);

            return {
                ...task,
                links: task.links.filter(Boolean),
                targetParticipants: targetParticipantsForTask,
                currentParticipants: 0,
                guideText: guideText || task.guideText || '',
                guideLink: guideLink || task.guideLink || '',
            };
        });

        const finalDescription = description || 'A new campaign created via the platform.';

        // *** NEW LOGIC: Fetch creator's logo from their Project/CreatorDashboard ***
        let creatorLogoUrl = 'https://via.placeholder.com/48?text=New'; // Default placeholder
        const creatorDashboard = await Project.findOne({ ownerId: creatorId }); // Find the creator's dashboard by their user ID

        if (creatorDashboard && creatorDashboard.logo) {
            creatorLogoUrl = creatorDashboard.logo; // Use the logo from the creator's dashboard
        }
        // *** END NEW LOGIC ***


        const newCampaign = new Campaign({
            name: name || `Campaign ${new Date().toLocaleString()}`,
            logo: creatorLogoUrl, // *** FIXED: Use the dynamically fetched creatorLogoUrl ***
            tags: [], // You might want to pull tags from creatorDashboard too if they are universal
            image: imageUrl,
            imagePublicId: imagePublicId,
            socials: parsedSocials || { twitter: '', telegram: '', discord: '', website: '' },
            description: finalDescription,
            creatorType: 'General',
            uniqueId: uniqueId,
            createdBy: creatorId,
            budget: parsedBudget,
            numberOfUsers: parsedNumberOfUsers,
            earningTag: earningTag,
            rules: parsedRules.map((r) => r.trim()).filter(Boolean),
            campaignTasks: updatedCampaignTasks,
            totalEngagementsExpected: totalEngagementsExpected,
            estimatedTotalCampaignCost: estimatedTotalCampaignCost,
            totalActiveTaskTypes: totalActiveTaskTypes,
            payoutPerUser: payoutPerUser,
            status: 'active',
            completedUsersCount: 0,
            completedUsers: [],
        });

        console.log("BACKEND LOG: (Point 2) newCampaign document BEFORE .save():", newCampaign);
        if (newCampaign.campaignTasks.length > 0 && newCampaign.campaignTasks[0].links) {
            console.log("BACKEND LOG: (Point 2) First task's links array in Mongoose document BEFORE .save():", newCampaign.campaignTasks[0].links);
            if (newCampaign.campaignTasks[0].links.length > 0) {
                console.log("BACKEND LOG: (Point 2) First link object in Mongoose document BEFORE .save():", newCampaign.campaignTasks[0].links[0]);
            }
        }

        const savedCampaign = await newCampaign.save();
        console.log("BACKEND LOG: Campaign saved successfully (AFTER .save()):", savedCampaign);

        res.status(201).json(savedCampaign);

    } catch (err) {
        console.error("Error creating campaign:", err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: "Validation error: " + messages.join(', ') });
        }
        if (err.code === 11000) {
            return res.status(409).json({ message: "A campaign with this unique ID already exists. Please try again." });
        }
        res.status(500).json({ message: "Internal server error: " + err.message });
    }
});

// --- NEW ROUTE: User Joins a specific Task Group ---
router.post('/:id/tasks/:taskGroupKey/join', authenticateJWT, async (req, res) => {
    try {
        const { id: campaignId, taskGroupKey } = req.params;
        const userId = req.user.id;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found.' });
        }

        const taskGroup = campaign.campaignTasks.find(task => task.key === taskGroupKey);
        if (!taskGroup) {
            return res.status(400).json({ message: `Task group with key '${taskGroupKey}' not found in this campaign.` });
        }

        if (taskGroup.currentParticipants >= taskGroup.targetParticipants) {
            return res.status(400).json({ message: `This task group (${taskGroup.name}) is already full.` });
        }

        const existingParticipation = await UserParticipation.findOne({
            campaign: campaignId,
            user: userId,
            taskGroupKey: taskGroupKey
        });

        if (existingParticipation) {
            return res.status(409).json({ message: `You have already joined the '${taskGroup.name}' task group in this campaign.`, participation: existingParticipation.toObject() });
        }

        // Calculate the payout amount for a single instance of this task group
        const payoutPerInstanceForThisGroup = taskGroup.payoutPerInstance || 0;

        const completedTasksArray = [];
        for (let i = 0; i < taskGroup.instances; i++) {
            const actualTaskUrl = (taskGroup.links && taskGroup.links[i] && taskGroup.links[i].link)
                                    ? taskGroup.links[i].link
                                    : null;

            const uniqueTaskIdentifier = `${taskGroupKey}-${i}`;

            completedTasksArray.push({
                link: uniqueTaskIdentifier,
                targetUrl: actualTaskUrl,
                status: 'not-started',
                proofLink: null,
                proofFileUrl: null,
                proofFileId: null,
                submittedAt: null,
                reviewedAt: null,
                reviewerNotes: null,
                payoutAmount: payoutPerInstanceForThisGroup
            });
        }

        const newUserParticipation = new UserParticipation({
            campaign: campaignId,
            user: userId,
            taskGroupKey: taskGroupKey,
            completedTasks: completedTasksArray,
            status: 'in-progress',
            joinedAt: new Date()
        });

        await newUserParticipation.save();

        const updatedCampaign = await Campaign.findOneAndUpdate(
            { _id: campaignId, "campaignTasks.key": taskGroupKey },
            { $inc: { "campaignTasks.$.currentParticipants": 1 } },
            { new: true }
        );

        const updatedTaskGroup = updatedCampaign ? updatedCampaign.campaignTasks.find(task => task.key === taskGroupKey) : null;

        if (!updatedCampaign || !updatedTaskGroup) {
            console.warn(`Failed to update campaign or find task group after user joined. Campaign ID: ${campaignId}, Task Group Key: ${taskGroupKey}`);
            return res.status(500).json({ message: "Successfully joined task group, but failed to update campaign counter. Please contact support." });
        }

        res.status(200).json({
            message: `Successfully joined the '${taskGroup.name}' task group!`,
            userParticipation: newUserParticipation,
            currentParticipants: updatedTaskGroup.currentParticipants
        });

    } catch (err) {
        console.error(`Error participating in campaign ${req.params.id} task group ${req.params.taskGroupKey}:`, err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format in request." });
        }
        if (err.code === 11000) {
            return res.status(409).json({ message: "You are already participating in this task group." });
        }
        res.status(500).json({ message: "Internal server error: " + err.message });
    }
});


// --- Handle Proof File Upload to Cloudinary ---
router.post(
    '/:id/tasks/:taskGroupKey/upload-proof',
    authenticateJWT,
    upload.single('proofImage'),
    async (req, res) => {
        try {
            console.log('[UPLOAD-PROOF] Request received.');
            const { id: campaignId, taskGroupKey } = req.params;
            const userId = req.user.id;
            const { link } = req.body;

            console.log(`[UPLOAD-PROOF] Params from URL: CampaignID=${campaignId}, TaskGroupKey=${taskGroupKey}`);
            console.log(`[UPLOAD-PROOF] Authenticated UserID: ${userId}`);
            console.log(`[UPLOAD-PROOF] Link from Request Body (Frontend): ${link}`);

            if (!req.file) {
                console.warn('[UPLOAD-PROOF] No file received by multer for link:', link);
                return res.status(400).json({ message: 'No file uploaded or file not processed. Ensure file is an image and within size limits.' });
            }
            if (!link) {
                console.warn('[UPLOAD-PROOF] Missing link from request body.');
                return res.status(400).json({ message: "Sub-task identifier (link) is missing." });
            }

            console.log('[UPLOAD-PROOF] File received. Mimetype:', req.file.mimetype);
            console.log('[UPLOAD-PROOF] File buffer size:', req.file.buffer.length);

            const uploadResult = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                {
                    folder: `campaign_proofs/${campaignId}/${userId}`,
                    resource_type: 'image',
                }
            );

            const proofFileUrl = uploadResult.secure_url;
            const proofFileId = uploadResult.public_id;

            console.log('[UPLOAD-PROOF] Cloudinary upload successful. URL:', proofFileUrl);

            console.log(`[UPLOAD-PROOF] Attempting to find UserParticipation for Campaign: ${campaignId}, User: ${userId}, TaskGroupKey: ${taskGroupKey}`);
            const userParticipation = await UserParticipation.findOne({
                campaign: campaignId,
                user: userId,
                taskGroupKey: taskGroupKey
            });

            if (!userParticipation) {
                console.warn(`[UPLOAD-PROOF] User participation not found for campaign ${campaignId}, user ${userId}, task group ${taskGroupKey}`);
                return res.status(404).json({ message: "User participation for this task group not found." });
            }

            console.log(`[UPLOAD-PROOF] Found UserParticipation document. ID: ${userParticipation._id}`);
            console.log('[UPLOAD-PROOF] Current completedTasks links in DB:', userParticipation.completedTasks.map(t => t.link));

            let taskToUpdate = userParticipation.completedTasks.find(task => task.link === link);

            if (!taskToUpdate) {
                console.warn(`[UPLOAD-PROOF] Sub-task with link '${link}' not found in user's participation for task group '${taskGroupKey}'.`);
                return res.status(404).json({ message: "The specific sub-task you are submitting proof for was not found in your participation record." });

            } else {
                if (taskToUpdate.status === 'completed' || taskToUpdate.status === 'pending-review') {
                    console.warn(`[UPLOAD-PROOF] Proof already ${taskToUpdate.status} for link: ${link}. Overwriting if allowed.`);
                }

                taskToUpdate.status = 'pending-review';
                taskToUpdate.proofFileUrl = proofFileUrl;
                taskToUpdate.proofFileId = proofFileId;
                taskToUpdate.submittedAt = new Date();
                console.log(`[UPLOAD-PROOF] Existing task entry updated for link: ${link}`);
            }

            await userParticipation.save();
            console.log('[UPLOAD-PROOF] UserParticipation saved successfully.');

            const allTasksSubmittedOrCompleted = userParticipation.completedTasks.every(
                task => task.status === 'completed' || task.status === 'pending-review' || task.status === 'rejected'
            );

            let groupStatus = userParticipation.status;
            if (allTasksSubmittedOrCompleted) {
                groupStatus = 'pending-review';
                if (userParticipation.status !== groupStatus) {
                    userParticipation.status = groupStatus;
                    await userParticipation.save();
                    console.log('[UPLOAD-PROOF] UserParticipation group status updated to pending-review.');
                }
            }

            res.status(200).json({
                message: "File proof uploaded successfully and submitted for review!",
                imageUrl: proofFileUrl,
                userParticipation: userParticipation,
                taskStatus: taskToUpdate.status,
                groupStatus: groupStatus
            });

        } catch (err) {
            console.error('[UPLOAD-PROOF ERROR] Caught error:', err.message);
            console.error('[UPLOAD-PROOF ERROR] Stack:', err.stack);

            if (err instanceof multer.MulterError) {
                console.error('[UPLOAD-PROOF ERROR] Multer Error:', err.code);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ message: 'File too large. Maximum 5MB allowed.', error: err.message });
                }
                return res.status(400).json({ message: 'File upload error (Multer).', error: err.message });
            } else if (err.http_code) {
                return res.status(err.http_code).json({ message: 'Cloudinary upload failed.', error: err.message });
            }
            res.status(500).json({ message: "Internal server error during proof file upload.", error: err.message });
        }
    }
);

// --- SUBMIT Task Proof (User) for non-file based proofs ---
router.post('/:id/tasks/:taskGroupKey/submit-proof', authenticateJWT, async (req, res) => {
    try {
        const { id: campaignId, taskGroupKey } = req.params;
        const userId = req.user.id;
        const { link, proofData } = req.body; // link of the task, proofData contains proofLink and potentially proofFileUrl/Id

        if (!link) {
            return res.status(400).json({ message: "Task link is required." });
        }

        const userParticipation = await UserParticipation.findOne({
            campaign: campaignId,
            user: userId,
            taskGroupKey: taskGroupKey
        });

        if (!userParticipation) {
            return res.status(404).json({ message: "User participation for this task group not found." });
        }

        const taskToUpdate = userParticipation.completedTasks.find(task => task.link === link);

        if (!taskToUpdate) {
            return res.status(404).json({ message: "Specific task link not found in your participation record." });
        }

        // Prevent resubmission if already completed or pending review
        if (taskToUpdate.status === 'completed' || taskToUpdate.status === 'pending-review') {
            return res.status(400).json({ message: `Proof for this task is already ${taskToUpdate.status}.` });
        }

        // --- NEW LOGIC: Conditional Proof Validation ---
        // First, get the specific task definition from the campaign to know its type
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found for task type check." });
        }
        const campaignTaskGroup = campaign.campaignTasks.find(tg => tg.key === taskGroupKey);
        if (!campaignTaskGroup) {
            return res.status(404).json({ message: "Campaign task group not found for type check." });
        }
        // Assuming individual tasks within a group might also have types or specific requirements,
        // though your current schema for `completedTasks` doesn't explicitly store `type` per link.
        // If `subTask.type` is directly available on `taskToUpdate` (from initial `taskGroup.links` mapping), use that.
        // Otherwise, you'll need to infer from `campaignTaskGroup.key`.

        const taskType = campaignTaskGroup.key; // Example: 'x-like', 'manual-link', 'manual-upload'

        let submittedProofLink = null;
        let submittedProofFileUrl = null;
        let submittedProofFileId = null;

        console.log(`[SUBMIT PROOF] Task Type: ${taskType}, Proof Data Received:`, proofData);

        // Define which task types do NOT require an explicit proofLink from the user input field
        const socialTaskTypes = ['x-like', 'x-retweet', 'x-comment', 'x-follow', 'telegram', 'discord', 'website'];
        const isManualLinkTask = taskType === 'manual-link' || (taskType.startsWith('custom-') && !campaignTaskGroup.requiresFileUpload); // Assuming 'requiresFileUpload' property for custom tasks
        const isManualUploadTask = taskType === 'manual-upload' || (taskType.startsWith('custom-') && campaignTaskGroup.requiresFileUpload);

        if (socialTaskTypes.includes(taskType)) {
            // For social tasks, the frontend might send the original task link or a simple 'done' string
            // We just need confirmation that *something* was submitted.
            // The `proofData` might simply be `{ proofLink: 'done' }` or `{ proofLink: originalTaskLink }`
            if (!proofData || !proofData.proofLink) {
                 return res.status(400).json({ message: "Proof confirmation (e.g., 'done' or original task link) is required for this task." });
            }
            submittedProofLink = proofData.proofLink.trim();
        } else if (isManualLinkTask) {
            // For manual-link tasks, an explicit proofLink is always required from the user
            if (!proofData || !proofData.proofLink || typeof proofData.proofLink !== 'string' || proofData.proofLink.trim().length === 0) {
                return res.status(400).json({ message: "A valid proof link is required for this custom task." });
            }
            submittedProofLink = proofData.proofLink.trim();
        } else if (isManualUploadTask) {
            // For manual-upload tasks, proofFileUrl and proofFileId are required
            // This route should generally not handle the actual file upload, but confirm it was uploaded via the /upload-proof route
            if (!proofData || !proofData.proofFileUrl || !proofData.proofFileId) {
                return res.status(400).json({ message: "Proof file upload data is required for this custom task. Please upload the file first." });
            }
            submittedProofFileUrl = proofData.proofFileUrl;
            submittedProofFileId = proofData.proofFileId;
        } else {
            // Fallback for any other unexpected task types or if default proofLink is expected
            if (!proofData || !proofData.proofLink || typeof proofData.proofLink !== 'string' || proofData.proofLink.trim().length === 0) {
                return res.status(400).json({ message: "Proof data (proofLink or proofFile) is required for this task." });
            }
            submittedProofLink = proofData.proofLink.trim();
        }
        // --- END NEW LOGIC ---

        taskToUpdate.status = 'pending-review'; // Set status to pending review
        taskToUpdate.proofLink = submittedProofLink; // Store the conditionally set proof link
        taskToUpdate.proofFileUrl = submittedProofFileUrl; // Store file URL if applicable
        taskToUpdate.proofFileId = submittedProofFileId; // Store file ID if applicable
        taskToUpdate.submittedAt = new Date(); // Record submission time

        await userParticipation.save();

        // Update the overall group status if all individual tasks are submitted/completed
        const allTasksSubmittedOrCompleted = userParticipation.completedTasks.every(
            task => task.status === 'completed' || task.status === 'pending-review' || task.status === 'rejected'
        );

        let groupStatus = userParticipation.status;
        if (allTasksSubmittedOrCompleted) {
            groupStatus = 'pending-review';
            if (userParticipation.status !== groupStatus) {
                userParticipation.status = groupStatus;
                await userParticipation.save();
            }
        }

        res.status(200).json({
            message: "Proof submitted successfully. It will be reviewed by the campaign creator.",
            taskStatus: taskToUpdate.status,
            groupStatus: groupStatus,
            userParticipation: userParticipation.toObject() // Return updated participation
        });

    } catch (err) {
        console.error(`Error submitting proof for campaign ${req.params.id}, task group ${req.params.taskGroupKey}, link ${req.body.link}:`, err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format or data." });
        }
        res.status(500).json({ message: "Internal server error: " + err.message });
    }
});


// --- LEAVE Campaign Task Group ---
router.post('/:id/tasks/:taskGroupKey/leave', authenticateJWT, async (req, res) => {
    try {
        const { id: campaignId, taskGroupKey } = req.params;
        const userId = req.user.id;

        // 1. Find and delete the UserParticipation record for this user and task group
        const deletedParticipation = await UserParticipation.findOneAndDelete({
            campaign: campaignId,
            user: userId,
            taskGroupKey: taskGroupKey
        });

        if (!deletedParticipation) {
            return res.status(404).json({ message: "You are not currently participating in this task group." });
        }

        // 2. Decrement the currentParticipants count in the Campaign model
        const updatedCampaign = await Campaign.findOneAndUpdate(
            { _id: campaignId, "campaignTasks.key": taskGroupKey },
            { $inc: { "campaignTasks.$.currentParticipants": -1 } },
            { new: true } // Return the updated document
        );

        if (!updatedCampaign) {
            console.warn(`Campaign or task group not found for decrement after user left. Campaign ID: ${campaignId}, Task Group Key: ${taskGroupKey}`);
            // It's possible the campaign itself was deleted, or the taskGroupKey became invalid.
            // Still return success for the user leaving, but log a server-side warning.
            return res.status(200).json({ message: "Successfully left the task group, but campaign counter update failed. Please contact support if this persists." });
        }
        const updatedTaskGroup = updatedCampaign.campaignTasks.find(task => task.key === taskGroupKey);

        res.status(200).json({
            message: `Successfully left the '${taskGroupKey}' task group.`,
            currentParticipants: updatedTaskGroup ? updatedTaskGroup.currentParticipants : 0
        });

    } catch (err) {
        console.error(`Error leaving campaign ${req.params.id} task group ${req.params.taskGroupKey}:`, err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format in request." });
        }
        res.status(500).json({ message: "Internal server error: " + err.message });
    }
});

// --- VERIFY Task for a specific participation (Creator Only) ---
router.post('/:campaignId/participations/:participationId/tasks/:taskIndex/verify', authenticateJWT, async (req, res) => {
    const { campaignId, participationId, taskIndex } = req.params;
    const { status, fraudReported } = req.body; // status: 'completed' or 'rejected', fraudReported: boolean
    const creatorId = req.user.id; // The ID of the authenticated creator

    try {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found.' });
        }
        if (String(campaign.createdBy) !== String(creatorId)) {
            return res.status(403).json({ message: 'Forbidden: You are not the creator of this campaign.' });
        }
        const userParticipation = await UserParticipation.findById(participationId);
        if (!userParticipation) {
            return res.status(404).json({ message: 'User participation record not found.' });
        }
        if (taskIndex < 0 || taskIndex >= userParticipation.completedTasks.length) {
            return res.status(400).json({ message: 'Invalid task index.' });
        }

        const taskToReview = userParticipation.completedTasks[taskIndex];
        if (taskToReview.status !== 'pending-review') {
            return res.status(400).json({ message: `Task status is '${taskToReview.status}'. Only 'pending-review' tasks can be verified.` });
        }
        const oldUserParticipationStatus = userParticipation.status;
        taskToReview.status = status;
        if (status === 'completed') {
            taskToReview.reviewedAt = new Date();
        } else if (status === 'rejected') {
            taskToReview.reviewedAt = new Date();
        }
        if (fraudReported) {
            taskToReview.isFraudulent = true;
            taskToReview.fraudReportedBy = creatorId;
            console.log(`[Campaign Task Review] Fraud reported for user ${userParticipation.user} on task ${taskToReview.link} in campaign ${campaignId}`);
        } else {
            taskToReview.isFraudulent = false;
            taskToReview.fraudReportedBy = null;
        }
        const allTasksInGroupReviewed = userParticipation.completedTasks.every(
            task => task.status === 'completed' || task.status === 'rejected'
        );

        let overallGroupStatus = userParticipation.status;
        let groupJustCompleted = false;
        if (allTasksInGroupReviewed) {
            const allTasksInGroupCompletedSuccessfully = userParticipation.completedTasks.every(task => task.status === 'completed');
            if (allTasksInGroupCompletedSuccessfully) {
                overallGroupStatus = 'completed';
                userParticipation.completedAt = new Date(); // Mark the group as fully completed
                if (oldUserParticipationStatus !== 'completed') { // Check if it just turned completed
                    groupJustCompleted = true;
                }
            } else {
                overallGroupStatus = 'partially-completed';
            }
            userParticipation.status = overallGroupStatus; // Update the group status
        }
        await userParticipation.save(); // Save the updated userParticipation record

        // --- Trust Score and Earnings Logic ---
        const user = await User.findById(userParticipation.user);
        if (!user) {
            console.error(`User ${userParticipation.user} not found during task verification.`);
            return res.status(404).json({ message: "Associated user not found." });
        }

        if (status === 'completed') {
            const TRUST_SCORE_INCREASE = 1;
            const MAX_TRUST_SCORE = 1000;
            user.reputationScore = Math.min(user.reputationScore + TRUST_SCORE_INCREASE, MAX_TRUST_SCORE);

            // Directly use payoutAmount from the embedded taskToReview
            const earningPerSingleTaskInstance = taskToReview.payoutAmount || 0;
            user.pendingEarnings = (user.pendingEarnings || 0) + earningPerSingleTaskInstance;

            console.log(`User ${user.username}'s trust score increased to ${user.reputationScore}.`);
            console.log(`User ${user.username}'s pending earnings increased by ${earningPerSingleTaskInstance}. New total: ${user.pendingEarnings}`);
        } else if (status === 'rejected') {
            if (!fraudReported) {
                const TRUST_SCORE_DECREASE_REJECTION = 2;
                user.reputationScore = Math.max(user.reputationScore - TRUST_SCORE_DECREASE_REJECTION, 0);
                console.log(`User ${user.username}'s trust score decreased to ${user.reputationScore} due to rejection.`);
            }
        }

        if (fraudReported) {
            user.fraudulentSubmissionsCount = (user.fraudulentSubmissionsCount || 0) + 1;
            const FRAUD_BAN_THRESHOLD = 3;
            const TRUST_SCORE_DECREASE_FRAUD = 50;
            user.reputationScore = Math.max(user.reputationScore - TRUST_SCORE_DECREASE_FRAUD, 0);

            if (user.fraudulentSubmissionsCount >= FRAUD_BAN_THRESHOLD) {
                user.accountStatus = 'banned';
                user.banReason = `Banned for ${user.fraudulentSubmissionsCount} fraudulent submissions.`;
                user.banDate = new Date();
                console.log(`User ${user.username} banned due to repeated fraudulent submissions.`);
            }
        }
        await user.save(); // Save updated user profile

        // Logic to update campaign's completedUsersCount if all required tasks for a user are completed
        if (groupJustCompleted) {
            const allUserParticipationsForCampaign = await UserParticipation.find({
                campaign: campaignId,
                user: userParticipation.user
            });
            const requiredTaskGroupKeys = campaign.campaignTasks
                .filter(task => task.targetParticipants > 0 && task.allocationPercentage > 0)
                .map(task => task.key);
            const hasCompletedAllRequiredTaskGroups = requiredTaskGroupKeys.every(requiredKey =>
                allUserParticipationsForCampaign.some(up =>
                    up.taskGroupKey === requiredKey && up.status === 'completed'
                )
            );
            const userAlreadyCompletedCampaign = campaign.completedUsers.includes(userParticipation.user);

            if (hasCompletedAllRequiredTaskGroups && !userAlreadyCompletedCampaign) {
                campaign.completedUsersCount = (campaign.completedUsersCount || 0) + 1;
                campaign.completedUsers.push(userParticipation.user); // Add user to completed list
                await campaign.save();
                console.log(`User ${user.username} has completed all tasks for Campaign "${campaign.name}". completedUsersCount incremented to ${campaign.completedUsersCount}.`);
            }
        }

        res.status(200).json({
            message: `Task marked as ${status}.`,
            userParticipation: userParticipation, // Return updated participation
            userReputationScore: user.reputationScore, // Return updated reputation score
            userPendingEarnings: user.pendingEarnings, // Return updated pending earnings
            campaignCompletedUsersCount: campaign.completedUsersCount // Return the updated campaign count
        });

    } catch (err) {
        console.error(`Error verifying task for campaign ${campaignId}, participation ${participationId}, task index ${taskIndex}:`, err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid ID format in request.' });
        }
        res.status(500).json({ message: 'Internal server error: ' + err.message });
    }
});

// --- GET User Participation for a specific campaign ---
router.get('/:campaignId/user-participation', authenticateJWT, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id; // Get the authenticated user's ID

        // 1. Find all participation documents for this user and campaign
        const userParticipationsArray = await UserParticipation.find({
            campaign: campaignId,
            user: userId
        });

        // 2. Transform the array into an object (map) keyed by taskGroupKey
        const participationsMap = {};
        userParticipationsArray.forEach(participation => {
            // Use .toObject() to convert Mongoose document to a plain JavaScript object
            // This prevents potential issues with direct property access on Mongoose objects
            participationsMap[participation.taskGroupKey] = participation.toObject();
        });

        // 3. Send the transformed map back to the frontend
        // If participationsMap is empty, it will send an empty object {}, which is also fine for the frontend.
        res.status(200).json(participationsMap);

    } catch (err) {
        console.error(`Error fetching user participation for campaign ${req.params.campaignId} and user ${req.user.id}:`, err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid campaign ID or user ID format.' });
        }
        res.status(500).json({ message: 'Internal server error while fetching participations.' });
    }
});


// --- GET campaigns created by a specific user (creator) ---
router.get('/creator/:creatorId', authenticateJWT, async (req, res) => {
    try {
        const { creatorId } = req.params;
        const authenticatedUserId = req.user.id; // User ID from the authenticated JWT
        if (String(creatorId) !== String(authenticatedUserId)) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to view these campaigns.' });
        }

        // Find campaigns where the 'createdBy' field matches the creatorId
        // Populate the 'createdBy' field and select only the 'username'
        const campaigns = await Campaign.find({ createdBy: creatorId })
            .populate('createdBy', 'username') // Added populate
            .sort({ createdAt: -1 }); // Sort by creation date

        if (!campaigns || campaigns.length === 0) {
            return res.status(200).json({ message: 'No campaigns found for this creator.', campaigns: [] });
        }

        res.status(200).json({
            message: 'Creator campaigns fetched successfully.',
            campaigns: campaigns
        });

    } catch (err) {
        console.error('Error fetching creator campaigns:', err);
        // Handle CastError if creatorId is not a valid ObjectId
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid creator ID format.' });
        }
        res.status(500).json({ message: 'Internal server error while fetching creator campaigns.' });
    }
});


// --- VERIFY General Tweet (Simulated) - This route's functionality is a placeholder ---
router.post('/:id/verify-general-tweet', authenticateJWT, async (req, res) => {
    const { id: campaignId } = req.params;
    const { username, tweetContent } = req.body;
    const userId = req.user.id;

    if (!username || !tweetContent) {
        return res.status(400).json({ message: "Username and tweet content are required." });
    }

    try {
        console.log(`Attempting to verify tweet for user ${username} in campaign ${campaignId}`);
        console.log(`Expected tweet content: "${tweetContent}"`);

        // Simulate API call and verification logic
        const isTweetFound = Math.random() > 0.3; // Simulate success/failure for demonstration

        if (isTweetFound) {
            let generalTweetParticipation = await UserParticipation.findOne({
                campaign: campaignId,
                user: userId,
                taskGroupKey: 'general-tweet' // Treat as a special task group key
            });

            if (!generalTweetParticipation) {
                // If it's the first time, create a new participation record for this 'general-tweet' task type
                generalTweetParticipation = new UserParticipation({
                    campaign: campaignId,
                    user: userId,
                    taskGroupKey: 'general-tweet',
                    // Assuming 'general-tweet' is a task group in your campaign schema
                    // You might need to retrieve the payoutPerInstance for 'general-tweet' from the campaign object
                    // For simplicity here, assuming a fixed or 0 payout for this simulated general tweet.
                    completedTasks: [{ link: 'N/A', status: 'completed', proofLink: 'auto-verified', payoutAmount: 0 }], // Auto-verified
                    status: 'completed'
                });
            } else {
                // If it exists, update its status
                const existingTask = generalTweetParticipation.completedTasks.find(t => t.link === 'N/A');
                if (existingTask) {
                    existingTask.status = 'completed';
                    existingTask.proofLink = 'auto-verified';
                    // Update payoutAmount if it's dynamic for this task type
                } else {
                    generalTweetParticipation.completedTasks.push({ link: 'N/A', status: 'completed', proofLink: 'auto-verified', payoutAmount: 0 });
                }
                generalTweetParticipation.status = 'completed';
            }
            await generalTweetParticipation.save();

            res.status(200).json({ success: true, message: "Tweet verified successfully!" });
        } else {
            res.status(400).json({ success: false, message: "Tweet not found or does not meet criteria." });
        }

    } catch (err) {
        console.error(`Error verifying tweet for campaign ${campaignId}:`, err);
        res.status(500).json({ message: "Internal server error during tweet verification: " + err.message });
    }
});

// GET all tasks pending review for a specific campaign
router.get('/:campaignId/tasks-for-review', authenticateJWT, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const creatorId = req.user.id;

        // 1. Verify that the authenticated user is the creator of this campaign
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found.' });
        }
        if (String(campaign.createdBy) !== String(creatorId)) {
            return res.status(403).json({ message: 'Forbidden: You are not the creator of this campaign.' });
        }

        // 2. Find all UserParticipation documents for this campaign that have tasks pending review
        const pendingParticipations = await UserParticipation.find({
            campaign: campaignId,
            'completedTasks.status': 'pending-review' // Query for documents where at least one task is pending
        })
        .populate('user', 'username email reputationScore fraudulentSubmissionsCount') // Populate user details
        .select('user taskGroupKey completedTasks'); // Select only necessary fields

        // 3. Flatten the results and filter for only the 'pending-review' tasks
        const tasksToReview = [];
        pendingParticipations.forEach(participation => {
            const userDetails = participation.user ? participation.user.toObject() : {};

            participation.completedTasks.forEach((task, taskIndex) => {
                if (task.status === 'pending-review') {
                    // Find the original task definition from the campaign to get more context
                    const campaignTaskDef = campaign.campaignTasks.find(ct => ct.key === participation.taskGroupKey);
                    const originalLinkDef = campaignTaskDef && campaignTaskDef.links ? campaignTaskDef.links.find(l => l.link === task.link) : null;

                    tasksToReview.push({
                        campaignId: campaignId,
                        campaignName: campaign.name,
                        participationId: participation._id, // UserParticipation ID
                        userId: userDetails._id,
                        username: userDetails.username,
                        userEmail: userDetails.email,
                        userReputation: userDetails.reputationScore,
                        userFraudCount: userDetails.fraudulentSubmissionsCount,
                        taskGroupKey: participation.taskGroupKey,
                        taskGroupName: campaignTaskDef ? campaignTaskDef.name : 'Unknown Task Group',
                        taskIndex: taskIndex, // Important for updating individual task status
                        taskOriginalLink: task.link, // The link provided by the creator
                        taskType: originalLinkDef ? originalLinkDef.type : 'Unknown Type', // e.g., x-like, manual-upload
                        submittedProofLink: task.proofLink,
                        submittedProofFileUrl: task.proofFileUrl, // Cloudinary URL
                        submittedProofFileId: task.proofFileId,
                        submittedAt: task.submittedAt,
                        payoutAmount: task.payoutAmount,
                        reviewerNotes: task.reviewerNotes,
                        // Add more fields from campaignTaskDef or originalLinkDef if helpful
                        campaignTaskDefinition: campaignTaskDef, // Useful for showing guideText, guideLink, etc.
                        originalSubTaskDefinition: originalLinkDef // Useful for showing proofRequired, placeholder
                    });
                }
            });
        });

        // 4. Sort by submission time, oldest first (so creators review oldest first)
        tasksToReview.sort((a, b) => a.submittedAt - b.submittedAt);

        res.status(200).json(tasksToReview);

    } catch (err) {
        console.error("Error fetching tasks for review:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid Campaign ID format.' });
        }
        res.status(500).json({ message: 'Internal server error while fetching tasks for review.' });
    }
});


// GET a user's summarized completed tasks for a specific campaign
router.get('/:campaignId/users/:userId/summary', authenticateJWT, async (req, res) => {
    try {
        const { campaignId, userId } = req.params;
        const creatorId = req.user.id;

        // Verify creator (optional, depending on if you want users to see others' summaries)
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found.' });
        }
        if (String(campaign.createdBy) !== String(creatorId)) {
            return res.status(403).json({ message: 'Forbidden: You are not the creator of this campaign.' });
        }

        const userParticipations = await UserParticipation.find({
            campaign: campaignId,
            user: userId
        })
        .populate('user', 'username email reputationScore fraudulentSubmissionsCount')
        .select('taskGroupKey completedTasks status joinedAt');

        if (!userParticipations || userParticipations.length === 0) {
            return res.status(404).json({ message: 'No participation found for this user in this campaign.' });
        }

        const userSummary = {
            userId: userParticipations[0].user._id,
            username: userParticipations[0].user.username,
            email: userParticipations[0].user.email,
            reputationScore: userParticipations[0].user.reputationScore,
            fraudulentSubmissionsCount: userParticipations[0].user.fraudulentSubmissionsCount,
            campaignId: campaignId,
            campaignName: campaign.name,
            taskGroupSummaries: {},
            overallCampaignCompletionStatus: 'in-progress' // Default
        };

        let totalTasksCompleted = 0;
        let totalTasksPendingReview = 0;
        let totalTasksRejected = 0;
        let totalTasksInGroup = 0; // Total tasks intended for this user across all joined groups
        let totalPotentialEarnings = 0;
        let totalEarned = 0;

        // Iterate through each joined task group for this user
        userParticipations.forEach(participation => {
            const taskGroupKey = participation.taskGroupKey;
            const campaignTaskDef = campaign.campaignTasks.find(ct => ct.key === taskGroupKey);

            let groupCompleted = 0;
            let groupPending = 0;
            let groupRejected = 0;
            let groupTotal = participation.completedTasks.length;
            let groupEarned = 0;
            let groupPotentialEarn = 0;

            participation.completedTasks.forEach(task => {
                totalTasksInGroup++;
                groupPotentialEarn += task.payoutAmount; // Sum of potential earnings for all tasks in this group

                if (task.status === 'completed') {
                    groupCompleted++;
                    totalTasksCompleted++;
                    totalEarned += task.payoutAmount;
                } else if (task.status === 'pending-review') {
                    groupPending++;
                    totalTasksPendingReview++;
                } else if (task.status === 'rejected') {
                    groupRejected++;
                    totalTasksRejected++;
                }
            });

            userSummary.taskGroupSummaries[taskGroupKey] = {
                name: campaignTaskDef ? campaignTaskDef.name : taskGroupKey,
                groupStatus: participation.status,
                completed: groupCompleted,
                pendingReview: groupPending,
                rejected: groupRejected,
                totalTasksInGroup: groupTotal,
                earned: groupEarned,
                potentialEarn: groupPotentialEarn,
                joinedAt: participation.joinedAt
            };
            totalPotentialEarnings += groupPotentialEarn;
        });

        // Determine overall campaign completion status for the user
        const requiredTaskGroupKeys = campaign.campaignTasks
            .filter(task => task.targetParticipants > 0 && task.allocationPercentage > 0)
            .map(task => task.key);

        const hasCompletedAllRequiredTaskGroups = requiredTaskGroupKeys.every(requiredKey =>
            userParticipations.some(up =>
                up.taskGroupKey === requiredKey && up.status === 'completed'
            )
        );

        if (hasCompletedAllRequiredTaskGroups) {
            userSummary.overallCampaignCompletionStatus = 'completed';
        } else if (totalTasksCompleted > 0 || totalTasksPendingReview > 0) {
            userSummary.overallCampaignCompletionStatus = 'in-progress';
        } else {
            userSummary.overallCampaignCompletionStatus = 'not-started'; // Or 'no-tasks-joined'
        }

        userSummary.totalTasksCompleted = totalTasksCompleted;
        userSummary.totalTasksPendingReview = totalTasksPendingReview;
        userSummary.totalTasksRejected = totalTasksRejected;
        userSummary.totalTasksJoined = userParticipations.length; // Number of task groups joined
        userSummary.totalPotentialEarnings = totalPotentialEarnings;
        userSummary.totalEarned = totalEarned;

        res.status(200).json(userSummary);

    } catch (err) {
        console.error("Error fetching user campaign summary:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid ID format in request.' });
        }
        res.status(500).json({ message: 'Internal server error while fetching user summary.' });
    }
});

module.exports = router;