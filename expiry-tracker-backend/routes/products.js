const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/add', verifyToken, upload.single('image'), productController.addProduct);
router.get('/inventory', verifyToken, productController.getUserInventory);
router.get('/search', verifyToken, productController.searchProducts);
router.delete('/:id', verifyToken, productController.deleteProduct);

module.exports = router;