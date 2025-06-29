// backend/routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authenticateJWT = require('../middleware/authenticateJWT'); // <-- Make sure this is here!
const upload = require('../middleware/upload'); // <-- Make sure this is here for file uploads!

// @route   GET api/project/creator-dashboard-status
// @desc    Check if the authenticated user has a creator dashboard
// @access  Private
router.get('/creator-dashboard-status', authenticateJWT, projectController.getCreatorDashboardStatus);

// @route   POST api/project/creator-dashboard
// @desc    Create or Update a creator dashboard profile
// @access  Private
// Make sure 'upload.fields' matches your multer setup for logo and banner
router.post('/creator-dashboard', authenticateJWT, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), projectController.createOrUpdateCreatorDashboard);

// @route   GET api/project/creator-dashboard/:userId
// @desc    Get creator dashboard profile by user ID (for the owner)
// @access  Private (only accessible by the owner for their own ID)
router.get('/creator-dashboard/:userId', projectController.getCreatorDashboard); // Removed authenticateJWT

// @route   GET api/project/:id
// @desc    Get a single project by ID
// @access  Public (if you want public project views)
router.get('/:id', projectController.getProjectById); // Example of another route

// @route   GET api/project
// @desc    Get all projects
// @access  Public (if you want public project list)
router.get('/', projectController.getAllProjects); // Example of another route

// You might have other project-related routes here...

module.exports = router;