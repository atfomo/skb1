
const express = require('express');
const router = express.Router();
const cloudinary = require('../utils/cloudinaryConfig'); // Your Cloudinary config
const fs = require('fs'); // For file system operations if you temporarily store files



router.post('/upload-signed', async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
    }

    const file = req.files.image; // Assuming 'image' is the name of your file input
    const tempFilePath = `./temp/${file.name}`; // Temporary storage on your server


    await file.mv(tempFilePath);


    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: 'my-app-uploads', // Optional: folder in Cloudinary
    });


    fs.unlinkSync(tempFilePath);

    res.status(200).json({
      message: 'Image uploaded successfully!',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});


router.delete('/delete-image/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId);
    res.status(200).json({ message: 'Image deleted successfully!' });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

module.exports = router;