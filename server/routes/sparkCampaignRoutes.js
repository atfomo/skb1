

const express = require('express');
const router = express.Router();
const sparkCampaignController = require('../controllers/sparkCampaignController');
const authenticateJWT = require('../middleware/authenticateJWT'); // ⭐ IMPORTANT: THIS LINE MUST BE PRESENT ⭐
const telegramController = require('../controllers/telegramController'); // Unused in this file, consider removing if not needed elsewhere


const multer = require('multer');
const cloudinary = require('cloudinary').v2;


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



const storage = multer.memoryStorage(); // Stores the file in req.file.buffer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB (adjust as needed)
    fileFilter: (req, file, cb) => {

        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});




router.get('/public-active', sparkCampaignController.getPublicActiveSparkCampaigns);





router.post('/track-message', sparkCampaignController.trackMessage); // Correct: Removed authenticateJWT
router.post('/track-reaction', sparkCampaignController.trackReaction); // Correct: Removed authenticateJWT






router.get('/creator/:creatorId', authenticateJWT, sparkCampaignController.getSparkCampaignsByCreatorId);


router.post('/', authenticateJWT, upload.single('bannerImage'), sparkCampaignController.createSparkCampaign);
router.post('/verify-payment', authenticateJWT, sparkCampaignController.verifyPaymentAndActivateCampaign);
router.get('/', authenticateJWT, sparkCampaignController.getAllSparkCampaigns);


router.put('/:id', authenticateJWT, upload.single('bannerImage'), sparkCampaignController.updateSparkCampaign); // If banner can be updated, keep upload middleware
router.delete('/:id', authenticateJWT, sparkCampaignController.deleteSparkCampaign);
router.get('/:id', authenticateJWT, sparkCampaignController.getSparkCampaignById); // THIS ROUTE MUST BE LAST FOR /:id!

module.exports = router;