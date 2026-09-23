const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure images and files subdirectories
const imageDir = path.join(uploadDir, 'images');
const fileDir = path.join(uploadDir, 'files');
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

// Multer generic storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Separate destination based on mimetype loosely
        if (file.mimetype.startsWith('image/')) {
            cb(null, imageDir);
        } else {
            cb(null, fileDir);
        }
    },
    filename: function (req, file, cb) {
        // Fix encoding: multer/busboy interprets utf8 as latin1 by default for form-data filenames
        let decodedName = file.originalname;
        try {
            decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        } catch (e) {
            console.error('Filename decode err', e);
        }
        file.originalname = decodedName; // Update original name for route handlers to access

        // Prepend logic to avoid filename collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(decodedName);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit max
});

// Single image upload
router.post('/image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        res.json({
            success: true,
            filePath: `/uploads/images/${req.file.filename}`,
            fileName: req.file.originalname
        });
    } catch (err) {
        console.error('Image upload error:', err);
        res.status(500).json({ success: false, message: 'Server error during upload' });
    }
});

// General file upload
router.post('/file', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        let folder = 'files';
        if (req.file.mimetype.startsWith('image/')) {
            folder = 'images'; // multer stored it in images directory based on logic above
        }
        res.json({
            success: true,
            filePath: `/uploads/${folder}/${req.file.filename}`,
            fileName: req.file.originalname
        });
    } catch (err) {
        console.error('File upload error:', err);
        res.status(500).json({ success: false, message: 'Server error during upload' });
    }
});

module.exports = router;
