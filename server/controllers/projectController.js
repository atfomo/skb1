const Project = require('../models/Project');
// const fs = require('fs'); // No longer needed for local file deletion if using Cloudinary directly
// const path = require('path'); // No longer needed for local file paths

// Make sure you have your cloudinary config imported and initialized
// Assuming you have a setup like: const cloudinary = require('../../config/cloudinary');
const cloudinary = require('cloudinary').v2; // Or however you've initialized it

// Configure Cloudinary (if not already done globally/in a config file)
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });


// @route   POST api/project/creator-dashboard
// @desc    Create or Update a creator dashboard profile
// @access  Private
exports.createOrUpdateCreatorDashboard = async (req, res) => {
    // --- START CONTROLLER DEBUG LOGS ---
    console.log('\n--- PROJECT CONTROLLER DEBUG ---');
    console.log('Controller: createOrUpdateCreatorDashboard entered.');
    console.log('Controller: req.method:', req.method);
    console.log('Controller: req.url:', req.url);

    // Check if req.user is populated by authentication middleware
    if (!req.user) {
        console.error('Controller ERROR: req.user is NOT populated by auth middleware. Unauthorized access attempt or auth middleware missing/failed.');
        return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required to access this route.' });
    }
    console.log('Controller: req.user (from JWT payload):', req.user);
    console.log('Controller: req.user.id (ownerId from JWT payload):', req.user.id);

    // Check if req.body is populated by Multer
    if (!req.body || Object.keys(req.body).length === 0) {
        console.warn('Controller WARNING: req.body is empty. Multer might not be configured or running correctly, or no text fields sent.');
    }
    console.log('Controller: req.body (from form data - text fields):', req.body);
    console.log('Controller: req.files (from form data - file fields):', req.files);
    // --- END CONTROLLER DEBUG LOGS ---

    const ownerId = req.user.id;
    const projectFields = { ownerId };
    const socials = {};

    if (req.body.username) projectFields.username = req.body.username;
    if (req.body.name) projectFields.name = req.body.name;
    if (req.body.description !== undefined) projectFields.description = req.body.description;
    if (req.body.tags !== undefined) projectFields.tags = req.body.tags;

    if (req.body.twitter) socials.twitter = req.body.twitter;
    if (req.body.website) socials.website = req.body.website;
    if (req.body.discord) socials.discord = req.body.discord;

    if (Object.keys(socials).length > 0) {
        projectFields.socials = socials;
    }

    // --- NEW: Handle Cloudinary file uploads ---
    let logoUrl;
    let bannerUrl;

    if (req.files) {
        if (req.files['logo'] && req.files['logo'][0]) {
            try {
                // Convert buffer to Data URI for Cloudinary upload
                const logoFile = req.files['logo'][0];
                const logoDataUri = `data:${logoFile.mimetype};base64,${logoFile.buffer.toString('base64')}`;
                
                console.log('Cloudinary: Attempting to upload logo...');
                const logoResult = await cloudinary.uploader.upload(logoDataUri, {
                    folder: 'fomo_project_logos', // Specify a folder in Cloudinary
                    resource_type: 'auto' // Automatically detect file type
                });
                logoUrl = logoResult.secure_url; // This is the Cloudinary URL
                projectFields.logo = logoUrl; // Assign the Cloudinary URL to projectFields
                console.log('Cloudinary: Logo uploaded successfully. URL:', logoUrl);

            } catch (uploadError) {
                console.error("Cloudinary Logo Upload Error:", uploadError.message || uploadError);
                // Important: Do NOT set projectFields.logo if upload failed, or set it to a default
                // If you want to keep the old logo in case of new upload failure, handle it here.
                // For now, it will just not update the logo field in the database if upload fails.
            }
        }

        if (req.files['banner'] && req.files['banner'][0]) {
            try {
                const bannerFile = req.files['banner'][0];
                const bannerDataUri = `data:${bannerFile.mimetype};base64,${bannerFile.buffer.toString('base64')}`;

                console.log('Cloudinary: Attempting to upload banner...');
                const bannerResult = await cloudinary.uploader.upload(bannerDataUri, {
                    folder: 'fomo_project_banners', // Specify a folder in Cloudinary
                    resource_type: 'auto'
                });
                bannerUrl = bannerResult.secure_url; // This is the Cloudinary URL
                projectFields.banner = bannerUrl; // Assign the Cloudinary URL to projectFields
                console.log('Cloudinary: Banner uploaded successfully. URL:', bannerUrl);

            } catch (uploadError) {
                console.error("Cloudinary Banner Upload Error:", uploadError.message || uploadError);
                // Similar error handling as above
            }
        }
    }
    // --- END NEW Cloudinary file uploads ---


    console.log('Controller: Final projectFields object before DB operation:', projectFields);

    try {
        let project = await Project.findOne({ ownerId });

        if (project) {
            console.log('Controller: Found existing project for ownerId:', ownerId);

            const updateDoc = { $set: {} };
            for (const key in projectFields) {
                if (key !== 'socials') {
                    updateDoc.$set[key] = projectFields[key];
                }
            }

            if (projectFields.socials) {
                for (const socialKey in projectFields.socials) {
                    updateDoc.$set[`socials.${socialKey}`] = projectFields.socials[socialKey];
                }
            }

            // Handle clearing social fields if sent as empty strings
            ['twitter', 'website', 'discord'].forEach(socialField => {
                if (req.body[socialField] !== undefined && !req.body[socialField]) {
                    updateDoc.$set[`socials.${socialField}`] = '';
                }
            });

            // IMPORTANT: If you want to delete old Cloudinary images, you'll need to
            // get the public_id from the old URL and use `cloudinary.uploader.destroy()`
            // This is more complex than local `fs.unlink` and requires careful implementation
            // based on how you structure your Cloudinary IDs.
            // For now, I've commented out the `fs.unlink` logic as it's no longer relevant for Cloudinary.
            // If `project.logo` or `project.banner` was a Cloudinary URL, and it's being updated,
            // you'd typically extract the public_id from the old URL and call `cloudinary.uploader.destroy(public_id)`.
            // This requires storing public_id or parsing it from the URL.

            project = await Project.findOneAndUpdate(
                { ownerId },
                updateDoc,
                { new: true, runValidators: true }
            );
            console.log('Controller: Project updated successfully:', project);
            return res.json({ success: true, message: 'Dashboard updated successfully', data: project });
        }

        console.log('Controller: No existing project found for ownerId:', ownerId, '. Attempting to create new project...');
        if (!projectFields.username || !projectFields.name) {
            return res.status(400).json({ success: false, message: 'Missing required fields for new dashboard: username and name are mandatory.' });
        }

        project = new Project(projectFields);
        await project.save();
        console.log('Controller: New project created successfully:', project);
        res.status(201).json({ success: true, message: 'Dashboard created successfully', data: project });

    } catch (err) {
        console.error('Controller ERROR: Error during createOrUpdateCreatorDashboard:', err);

        if (err.code === 11000 && err.keyPattern && err.keyPattern.username) {
            return res.status(400).json({ success: false, message: 'Username already exists. Please choose a different one.' });
        }
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(el => el.message);
            console.error('Controller: Mongoose Validation errors:', errors);
            return res.status(400).json({ success: false, message: `Project validation failed: ${errors.join(', ')}` });
        }
        res.status(500).send('Server Error');
    }
};

// @route   GET api/project/creator-dashboard/:userId
// @desc    Get creator dashboard profile by user ID
// @access  Private (or Public if you want anyone to see it, but here it's for the owner)
exports.getCreatorDashboard = async (req, res) => {
    // No req.user check needed if this route is public
    // if (!req.user) {
    //     return res.status(401).json({ msg: 'Authentication required.' });
    // }

    // No ownership check needed if this route is public
    // if (req.params.userId !== req.user.id) {
    //     return res.status(403).json({ msg: 'Access denied. You can only view your own dashboard.' });
    // }

    try {
        const project = await Project.findOne({ ownerId: req.params.userId });

        if (!project) {
            // If no project found for the ownerId, return 404
            return res.status(404).json({ success: false, message: "Creator dashboard not found for this user." });
        }

        res.json({ success: true, data: project }); // Wrap in data object for consistency
    } catch (err) {
        console.error('Controller ERROR: Error in getCreatorDashboard:', err.message);
        // Handle CastError for invalid IDs
        if (err.name === 'CastError') {
             return res.status(400).json({ success: false, message: "Invalid user ID format." });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getCreatorDashboardStatus = async (req, res) => {
    console.log('Project Controller: getCreatorDashboardStatus entered for user ID:', req.user.id);
    try {
        const project = await Project.findOne({ ownerId: req.user.id });
        const hasDashboard = !!project; // Convert to boolean: true if project exists, false otherwise
        console.log('Project Controller: User has dashboard:', hasDashboard);
        return res.json({ hasDashboard }); // Use return here to prevent further execution
    } catch (err) {
        console.error('Project Controller ERROR: Error checking dashboard status:', err.message);
        return res.status(500).send('Server Error'); // Use return here
    }
};

// Example of getProjectById:
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ msg: 'Project not found' });
        }
        res.json(project);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') { // Handle invalid MongoDB ID format
            return res.status(400).json({ msg: 'Invalid Project ID' });
        }
        res.status(500).send('Server Error');
    }
};

// Example of getAllProjects:
exports.getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};