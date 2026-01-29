const express = require('express');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const {
  createVariant,
  getVariants,
  getVariant,
  updateVariant,
  deleteVariant,
  searchVariants,
  getAllVariants,
  adjustStock,
} = require('../controllers/variantController');
const { roleGuard } = require('../middleware/auth');

const router = express.Router();

// Product routes
router.post('/', roleGuard(['owner', 'manager']), createProduct);
router.get('/', getProducts);
router.get('/:productId', getProduct);
router.put('/:productId', roleGuard(['owner', 'manager']), updateProduct);
router.delete('/:productId', roleGuard(['owner']), deleteProduct);

// Search variants - must be before parametric routes
router.get('/variants/search', searchVariants);
router.get('/variants/all', getAllVariants);

// Variant routes
router.post('/:productId/variants', roleGuard(['owner', 'manager']), createVariant);
router.get('/:productId/variants', getVariants);
router.get('/:productId/variants/:variantId', getVariant);
router.put('/:productId/variants/:variantId', roleGuard(['owner', 'manager']), updateVariant);
router.delete('/:productId/variants/:variantId', roleGuard(['owner']), deleteVariant);
router.post('/:productId/variants/:variantId/adjust-stock', roleGuard(['owner', 'manager']), adjustStock);

module.exports = router;
