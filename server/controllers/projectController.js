const Project = require('../models/Project');





const cloudinary = require('cloudinary').v2; // Or however you've initialized it












exports.createOrUpdateCreatorDashboard = async (req, res) => {

    
    
    
    


    if (!req.user) {
        console.error('Controller ERROR: req.user is NOT populated by auth middleware. Unauthorized access attempt or auth middleware missing/failed.');
        return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required to access this route.' });
    }
    
    


    if (!req.body || Object.keys(req.body).length === 0) {
        console.warn('Controller WARNING: req.body is empty. Multer might not be configured or running correctly, or no text fields sent.');
    }
    
    


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


    let logoUrl;
    let bannerUrl;

    if (req.files) {
        if (req.files['logo'] && req.files['logo'][0]) {
            try {

                const logoFile = req.files['logo'][0];
                const logoDataUri = `data:${logoFile.mimetype};base64,${logoFile.buffer.toString('base64')}`;
                
                
                const logoResult = await cloudinary.uploader.upload(logoDataUri, {
                    folder: 'fomo_project_logos', // Specify a folder in Cloudinary
                    resource_type: 'auto' // Automatically detect file type
                });
                logoUrl = logoResult.secure_url; // This is the Cloudinary URL
                projectFields.logo = logoUrl; // Assign the Cloudinary URL to projectFields
                

            } catch (uploadError) {
                console.error("Cloudinary Logo Upload Error:", uploadError.message || uploadError);



            }
        }

        if (req.files['banner'] && req.files['banner'][0]) {
            try {
                const bannerFile = req.files['banner'][0];
                const bannerDataUri = `data:${bannerFile.mimetype};base64,${bannerFile.buffer.toString('base64')}`;

                
                const bannerResult = await cloudinary.uploader.upload(bannerDataUri, {
                    folder: 'fomo_project_banners', // Specify a folder in Cloudinary
                    resource_type: 'auto'
                });
                bannerUrl = bannerResult.secure_url; // This is the Cloudinary URL
                projectFields.banner = bannerUrl; // Assign the Cloudinary URL to projectFields
                

            } catch (uploadError) {
                console.error("Cloudinary Banner Upload Error:", uploadError.message || uploadError);

            }
        }
    }



    

    try {
        let project = await Project.findOne({ ownerId });

        if (project) {
            

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


            ['twitter', 'website', 'discord'].forEach(socialField => {
                if (req.body[socialField] !== undefined && !req.body[socialField]) {
                    updateDoc.$set[`socials.${socialField}`] = '';
                }
            });










            project = await Project.findOneAndUpdate(
                { ownerId },
                updateDoc,
                { new: true, runValidators: true }
            );
            
            return res.json({ success: true, message: 'Dashboard updated successfully', data: project });
        }

        
        if (!projectFields.username || !projectFields.name) {
            return res.status(400).json({ success: false, message: 'Missing required fields for new dashboard: username and name are mandatory.' });
        }

        project = new Project(projectFields);
        await project.save();
        
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




exports.getCreatorDashboard = async (req, res) => {










    try {
        const project = await Project.findOne({ ownerId: req.params.userId });

        if (!project) {

            return res.status(404).json({ success: false, message: "Creator dashboard not found for this user." });
        }

        res.json({ success: true, data: project }); // Wrap in data object for consistency
    } catch (err) {
        console.error('Controller ERROR: Error in getCreatorDashboard:', err.message);

        if (err.name === 'CastError') {
             return res.status(400).json({ success: false, message: "Invalid user ID format." });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getCreatorDashboardStatus = async (req, res) => {
    
    try {
        const project = await Project.findOne({ ownerId: req.user.id });
        const hasDashboard = !!project; // Convert to boolean: true if project exists, false otherwise
        
        return res.json({ hasDashboard }); // Use return here to prevent further execution
    } catch (err) {
        console.error('Project Controller ERROR: Error checking dashboard status:', err.message);
        return res.status(500).send('Server Error'); // Use return here
    }
};


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


exports.getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};