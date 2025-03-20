// ...existing code...
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure storage as needed

router.post('/', upload.single('file'), async (req, res) => { // added multer middleware
    // ...existing code...
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Process the file available at req.file
        // ...existing code...
        res.status(200).json({ message: 'File processed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ...existing code...
module.exports = router;
