const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

router.get('/summary', verifyToken, dashboardController.getSpendingSummary);
router.get('/by-category', verifyToken, dashboardController.getSpendingByCategory);
router.get('/history', verifyToken, dashboardController.getTransactionHistory);

module.exports = router;