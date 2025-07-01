
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authenticateJWT = require('../middleware/authenticateJWT'); // <-- Make sure this is here!
const upload = require('../middleware/upload'); // <-- Make sure this is here for file uploads!




router.get('/creator-dashboard-status', authenticateJWT, projectController.getCreatorDashboardStatus);





router.post('/creator-dashboard', authenticateJWT, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), projectController.createOrUpdateCreatorDashboard);




router.get('/creator-dashboard/:userId', projectController.getCreatorDashboard); // Removed authenticateJWT




router.get('/:id', projectController.getProjectById); // Example of another route




router.get('/', projectController.getAllProjects); // Example of another route



module.exports = router;