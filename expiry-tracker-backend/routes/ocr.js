const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const upload = require('../middleware/upload');

router.post('/extract', upload.single('image'), ocrController.extractDates);

module.exports = router;