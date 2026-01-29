import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService, variantService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/productDetail.css';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: '',
    reason: '',
    movementType: 'adjustment'
  });
  const [newVariant, setNewVariant] = useState({
    sku: '',
    name: '',
    supplierId: '',
    attributes: {},
    price: '',
    cost: '',
    currentStock: '',
    reorderLevel: ''
  });

  useEffect(() => {
    fetchProductDetails();
    fetchSuppliers();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      const [productRes, variantsRes] = await Promise.all([
        productService.getProduct(productId),
        variantService.getVariants(productId)
      ]);
      setProduct(productRes.data.data);
      setVariants(variantsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load product details');
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/inventory/suppliers?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setSuppliers(data.data.filter(s => s.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    try {
      await variantService.createVariant(productId, {
        sku: newVariant.sku,
        name: newVariant.name,
        supplierId: newVariant.supplierId,
        attributes: newVariant.attributes,
        price: parseFloat(newVariant.price),
        cost: parseFloat(newVariant.cost) || 0,
        currentStock: parseInt(newVariant.currentStock),
        reorderLevel: parseInt(newVariant.reorderLevel) || 10
      });
      toast.success('Variant added successfully');
      setNewVariant({ sku: '', name: '', supplierId: '', attributes: {}, price: '', cost: '', currentStock: '', reorderLevel: '' });
      setShowAddVariant(false);
      fetchProductDetails();
    } catch (error) {
      toast.error('Failed to add variant');
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!window.confirm('Are you sure you want to delete this variant?')) return;
    try {
      await variantService.deleteVariant(productId, variantId);
      toast.success('Variant deleted');
      fetchProductDetails();
    } catch (error) {
      toast.error('Failed to delete variant');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      await variantService.adjustStock(productId, adjustingStock, {
        quantity: parseInt(stockAdjustment.quantity),
        reason: stockAdjustment.reason,
        movementType: stockAdjustment.movementType
      });
      toast.success('Stock adjusted successfully');
      setAdjustingStock(null);
      setStockAdjustment({ quantity: '', reason: '', movementType: 'adjustment' });
      fetchProductDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const openStockAdjustment = (variantId) => {
    setAdjustingStock(variantId);
    setStockAdjustment({ quantity: '', reason: '', movementType: 'adjustment' });
  };

  if (loading) return <div className="loading">Loading product details...</div>;
  if (!product) return <div className="error">Product not found</div>;

  const canManage = ['owner', 'manager'].includes(user?.role);

  return (
    <div className="product-detail-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/inventory')}>
          ← Back to Inventory
        </button>
        <h1>{product.name}</h1>
      </div>

      <div className="product-info-card">
        <div className="info-row">
          <span className="label">Category:</span>
          <span className="value">{product.category}</span>
        </div>
        {product.brand && (
          <div className="info-row">
            <span className="label">Brand:</span>
            <span className="value">{product.brand}</span>
          </div>
        )}
        {product.description && (
          <div className="info-row">
            <span className="label">Description:</span>
            <span className="value">{product.description}</span>
          </div>
        )}
        <div className="info-row">
          <span className="label">Status:</span>
          <span className={`badge badge-${product.status}`}>{product.status}</span>
        </div>
      </div>

      <div className="variants-section">
        <div className="section-header">
          <h2>Product Variants</h2>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowAddVariant(!showAddVariant)}>
              + Add Variant
            </button>
          )}
        </div>

        {showAddVariant && canManage && (
          <form onSubmit={handleAddVariant} className="form-card">
            <input
              type="text"
              placeholder="SKU (e.g., PROD-001)"
              value={newVariant.sku}
              onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Variant Name (e.g., Blue - Large)"
              value={newVariant.name}
              onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
              required
            />
            <select
              value={newVariant.supplierId}
              onChange={(e) => setNewVariant({ ...newVariant, supplierId: e.target.value })}
              required
            >
              <option value="">Select Supplier *</option>
              {suppliers.map(supplier => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Price"
              value={newVariant.price}
              onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Cost (optional)"
              value={newVariant.cost}
              onChange={(e) => setNewVariant({ ...newVariant, cost: e.target.value })}
            />
            <input
              type="number"
              placeholder="Initial Stock"
              value={newVariant.currentStock}
              onChange={(e) => setNewVariant({ ...newVariant, currentStock: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Reorder Level (optional, default 10)"
              value={newVariant.reorderLevel}
              onChange={(e) => setNewVariant({ ...newVariant, reorderLevel: e.target.value })}
            />
            <div className="form-actions">
              <button type="submit" className="btn-primary">Add Variant</button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddVariant(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {variants.length === 0 ? (
          <div className="no-data">No variants found. Add a variant to start managing stock.</div>
        ) : (
          <div className="variants-table">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant._id}>
                    <td>{variant.sku}</td>
                    <td>{variant.name}</td>
                    <td>${variant.price?.toFixed(2)}</td>
                    <td>
                      <span className={variant.currentStock <= variant.reorderLevel ? 'stock-low' : 'stock-ok'}>
                        {variant.currentStock}
                      </span>
                    </td>
                    <td>{variant.reorderLevel}</td>
                    <td>
                      <span className={`badge badge-${variant.status}`}>{variant.status}</span>
                    </td>
                    {canManage && (
                      <td>
                        <button
                          className="btn-primary-sm"
                          onClick={() => openStockAdjustment(variant._id)}
                          style={{ marginRight: '8px' }}
                        >
                          Adjust Stock
                        </button>
                        <button
                          className="btn-danger-sm"
                          onClick={() => handleDeleteVariant(variant._id)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjustingStock && (
        <div className="modal-overlay" onClick={() => setAdjustingStock(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Adjust Stock</h3>
            <form onSubmit={handleAdjustStock}>
              <div className="form-group">
                <label>Quantity Change</label>
                <input
                  type="number"
                  placeholder="Enter positive to add, negative to subtract"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                  required
                  autoFocus
                />
                <small>Use positive numbers to add stock, negative to subtract</small>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  placeholder="Reason for adjustment (required)"
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                  required
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Movement Type</label>
                <select
                  value={stockAdjustment.movementType}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, movementType: e.target.value })}
                >
                  <option value="adjustment">Adjustment</option>
                  <option value="damage">Damage/Loss</option>
                  <option value="return">Return</option>
                  <option value="recount">Recount</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Adjust Stock</button>
                <button type="button" className="btn-secondary" onClick={() => setAdjustingStock(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
