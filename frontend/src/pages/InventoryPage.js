import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, variantService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/inventory.css';

const InventoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', category: '', brand: '' });
  const [editProduct, setEditProduct] = useState({ name: '', category: '', brand: '', description: '' });

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    try {
      const response = await productService.getProducts(page);
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await productService.createProduct(newProduct);
      toast.success('Product created successfully');
      setNewProduct({ name: '', category: '', brand: '' });
      setShowNewProduct(false);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to create product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await productService.deleteProduct(productId);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      await productService.updateProduct(editingProduct, editProduct);
      toast.success('Product updated successfully');
      setEditingProduct(null);
      setEditProduct({ name: '', category: '', brand: '', description: '' });
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const openEditProduct = (product) => {
    setEditingProduct(product._id);
    setEditProduct({
      name: product.name,
      category: product.category,
      brand: product.brand || '',
      description: product.description || ''
    });
  };

  if (loading) return <div className="loading">Loading inventory...</div>;

  const canManage = ['owner', 'manager'].includes(user?.role);

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h1>Inventory Management</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowNewProduct(!showNewProduct)}>
            + Add Product
          </button>
        )}
      </div>

      {showNewProduct && canManage && (
        <form onSubmit={handleAddProduct} className="form-card">
          <input
            type="text"
            placeholder="Product name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Category"
            value={newProduct.category}
            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Brand"
            value={newProduct.brand}
            onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
          />
          <button type="submit" className="btn-primary">Create</button>
          <button type="button" className="btn-secondary" onClick={() => setShowNewProduct(false)}>
            Cancel
          </button>
        </form>
      )}

      <div className="products-grid">
        {products.map((product) => (
          <div key={product._id} className="product-card">
            <h3>{product.name}</h3>
            <p className="category">{product.category}</p>
            <p className="brand">{product.brand}</p>
            <div className="actions">
              <button
                className="btn-secondary"
                onClick={() => navigate(`/products/${product._id}`)}
              >
                View Details
              </button>
              {canManage && (
                <>
                  <button
                    className="btn-primary-sm"
                    onClick={() => openEditProduct(product)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteProduct(product._id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Product</h3>
            <form onSubmit={handleEditProduct}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  placeholder="Product name"
                  value={editProduct.name}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  placeholder="Category"
                  value={editProduct.category}
                  onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input
                  type="text"
                  placeholder="Brand (optional)"
                  value={editProduct.brand}
                  onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Product description (optional)"
                  value={editProduct.description}
                  onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Update Product</button>
                <button type="button" className="btn-secondary" onClick={() => setEditingProduct(null)}>
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

export default InventoryPage;
