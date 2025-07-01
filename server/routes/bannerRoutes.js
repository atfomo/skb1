const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const authenticateJWT = require('../middleware/authenticateJWT'); // Keep this for admin routes
const multer = require('multer');
const cloudinary = require('../utils/cloudinaryConfig');


const bannerStorage = multer.memoryStorage();
const uploadBanner = multer({
    storage: bannerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for banner images
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(file.originalname.toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, gif) are allowed!'));
    }
});






router.get('/public/banners', async (req, res) => { // <-- FIXED: Removed 'authenticateJWT'
    try {

        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: 1 });

        res.status(200).json(banners);
    } catch (error) {
        console.error("Error fetching banners in public route:", error); // Specific log
        res.status(500).json({ message: 'Error fetching banners', error: error.message });
    }
});





router.get('/admin/banners', authenticateJWT, async (req, res) => {
    try {
        const banners = await Banner.find().sort({ order: 1, createdAt: 1 });
        res.status(200).json(banners);
    } catch (error) {
        console.error("Error fetching admin banners:", error);
        res.status(500).json({ message: 'Error fetching admin banners', error: error.message });
    }
});


router.post('/admin/banners', authenticateJWT, uploadBanner.single('bannerImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No banner image uploaded' });
        }

        const { title, link, order, isActive } = req.body;

        if (!title || !link) {
            return res.status(400).json({ message: 'Title and link are required' });
        }

        let cloudinaryResult;
        try {
            cloudinaryResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'banners', resource_type: 'image' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
        } catch (cloudinaryError) {
            console.error("Cloudinary upload error:", cloudinaryError);
            return res.status(500).json({ message: 'Error uploading image to Cloudinary', error: cloudinaryError.message });
        }

        const newBanner = new Banner({
            title,
            imageUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            link,
            order: order ? parseInt(order) : 0,
            isActive: isActive === 'true'
        });

        await newBanner.save();

        res.status(201).json({ message: 'Banner created successfully', banner: newBanner.toObject() });
    } catch (error) {
        console.error("Error creating banner:", error);
        res.status(500).json({ message: 'Error creating banner', error: error.message });
    }
});


router.put('/admin/banners/:id', authenticateJWT, uploadBanner.single('bannerImage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, link, order, isActive } = req.body;

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }


        if (req.file) {
            if (banner.publicId) {
                try {
                    await cloudinary.uploader.destroy(banner.publicId);
                } catch (deleteError) {
                    console.warn(`Warning: Could not delete old Cloudinary image (publicId: ${banner.publicId}):`, deleteError.message);
                }
            }

            let cloudinaryResult;
            try {
                cloudinaryResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'banners', resource_type: 'image' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    uploadStream.end(req.file.buffer);
                });
            } catch (cloudinaryError) {
                console.error("Cloudinary re-upload error:", cloudinaryError);
                return res.status(500).json({ message: 'Error re-uploading image to Cloudinary', error: cloudinaryError.message });
            }

            banner.imageUrl = cloudinaryResult.secure_url;
            banner.publicId = cloudinaryResult.public_id;
        }


        if (title) banner.title = title;
        if (link) banner.link = link;
        if (order !== undefined) banner.order = parseInt(order);
        if (isActive !== undefined) banner.isActive = isActive === 'true';

        await banner.save();
        res.status(200).json({ message: 'Banner updated successfully', banner: banner.toObject() });
    } catch (error) {
        console.error("Error updating banner:", error);
        res.status(500).json({ message: 'Error updating banner', error: error.message });
    }
});


router.delete('/admin/banners/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findByIdAndDelete(id);

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        if (banner.publicId) {
            try {
                await cloudinary.uploader.destroy(banner.publicId);
            } catch (deleteError) {
                console.error(`Error deleting Cloudinary image (publicId: ${banner.publicId}):`, deleteError.message);
            }
        }

        res.status(200).json({ message: 'Banner deleted successfully' });
    } catch (error) {
        console.error("Error deleting banner:", error);
        res.status(500).json({ message: 'Error deleting banner', error: error.message });
    }
});

module.exports = router;