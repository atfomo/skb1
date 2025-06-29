// backend/middleware/upload.js
const multer = require('multer');
// No need for path or fs here if using memory storage and Cloudinary directly

const storage = multer.memoryStorage(); // <--- CHANGE THIS TO memoryStorage() for Cloudinary

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
    fileFilter: fileFilter
});

module.exports = upload;