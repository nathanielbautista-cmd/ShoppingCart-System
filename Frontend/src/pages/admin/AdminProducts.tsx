import './AdminProducts.css';
import React, { useMemo, useRef, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Check, AlertCircle, ChevronDown, Image as ImageIcon, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Product } from '../../types';

export const AdminProducts: React.FC = () => {
  const { products, saveProduct, deleteProduct, settings } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [expectedWeightGrams, setExpectedWeightGrams] = useState('');
  const [stock, setStock] = useState('');
  const [minimumStock, setMinimumStock] = useState('');
  const [image, setImage] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [formError, setFormError] = useState('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(products.map((product) => product.category.trim()).filter(Boolean))
    ).sort((first, second) => first.localeCompare(second));
  }, [products]);

  const openAddModal = () => {
    setEditingProduct(null);
    setBarcode('');
    setName('');
    setCategory('');
    setDescription('');
    setPrice('');
    setExpectedWeightGrams('');
    setStock('');
    setMinimumStock('');
    setImage('');
    setExpirationDate('');
    setIsCategoryMenuOpen(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setBarcode(p.barcode);
    setName(p.name);
    setCategory(p.category);
    setDescription(p.description || '');
    setPrice(p.price.toString());
    setExpectedWeightGrams(p.expectedWeightGrams.toString());
    setStock(p.stock.toString());
    setMinimumStock(p.minimumStock.toString());
    setImage(p.image || '');
    setExpirationDate(p.expirationDate ? p.expirationDate.slice(0, 10) : '');
    setIsCategoryMenuOpen(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim() || !category.trim() || !price || !expectedWeightGrams) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now().toString().slice(-4)}`,
      barcode: barcode.trim(),
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      expectedWeightGrams: parseInt(expectedWeightGrams, 10) || 0,
      stock: parseInt(stock, 10) || 0,
      minimumStock: parseInt(minimumStock, 10) || 5,
      image,
      expirationDate: expirationDate || undefined,
    };

    try {
      await saveProduct(newProd);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save product.');
    }
  };

  const handleImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setFormError('Please choose an image file.');
    if (file.size > 2 * 1024 * 1024) return setFormError('Image must be 2 MB or smaller.');
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => setFormError('Unable to read the selected image. Please try another file.');
    reader.readAsDataURL(file);
    setFormError('');
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const matchingCategoryOptions = categoryOptions.filter((categoryOption) =>
    categoryOption.toLowerCase().includes(category.trim().toLowerCase())
  );

  return (
    <div className="admin-products">

      <div className="admin-products__header">
        <div>
          <h2 className="admin-products__title">Product Catalog</h2>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="admin-products__add-icon" />}
          onClick={openAddModal}
        >
          Add Product
        </Button>
      </div>


      <div className="admin-products__search-section">
        <div className="admin-products__search-box">
          <Search className="admin-products__search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product"
            className="admin-products__search-input"
          />
        </div>
        <div className="admin-products__list-category-filter">
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            aria-label="Filter products by category"
          >
            <option value="ALL">All Categories</option>
            {categoryOptions.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>{categoryOption}</option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </div>
      </div>


      <div className="admin-products__table-wrapper">
        <table className="admin-products__table">
          <thead className="admin-products__table-head">
            <tr>
              <th className="admin-products__table-header">Barcode</th>
              <th>Image</th>
              <th className="admin-products__table-header">Product Name</th>
              <th className="admin-products__table-header">Category</th>
              <th className="admin-products__table-header">Price</th>
              <th className="admin-products__table-header">Weight</th>
              <th className="admin-products__table-header">Stock</th>
              <th className="admin-products__table-header">Status</th>
              <th className="admin-products__table-header admin-products__table-header--actions">Actions</th>
            </tr>
          </thead>
          <tbody className="admin-products__table-body">
            {filteredProducts.map((p) => {
              const isLowStock = p.stock <= p.minimumStock;
              const isOutOfStock = p.stock === 0;

              return (
                <tr key={p.id} className="admin-products__table-row">
                  <td className="admin-products__barcode">{p.barcode}</td>
                  <td>{p.image ? <img className="product-thumbnail" src={p.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span className="product-thumbnail__placeholder" title="No product image"><ImageIcon aria-hidden="true" /></span>}</td>
                  <td className="admin-products__name">{p.name}</td>
                  <td className="admin-products__category">{p.category}</td>
                  <td className="admin-products__price">
                    {settings.currencySymbol} {p.price.toFixed(2)}
                  </td>
                  <td className="admin-products__weight">{p.expectedWeightGrams}g</td>
                  <td className="admin-products__stock">{p.stock}</td>
                  <td className="admin-products__status-cell">
                    {isOutOfStock ? (
                      <span className="admin-products__status admin-products__status--out">Out of Stock</span>
                    ) : isLowStock ? (
                      <span className="admin-products__status admin-products__status--low">Low Stock</span>
                    ) : (
                      <span className="admin-products__status admin-products__status--available">Available</span>
                    )}
                  </td>
                  <td className="admin-products__actions-cell">
                    <div className="admin-products__row-actions">
                      <button
                        onClick={() => openEditModal(p)}
                        className="admin-products__action-button admin-products__action-button--edit"
                        title="Edit Product"
                      >
                        <Edit2 className="admin-products__action-icon" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Delete ${p.name}?`)) return;
                          try {
                            await deleteProduct(p.id);
                          } catch (error) {
                            setFormError(error instanceof Error ? error.message : 'Unable to delete product.');
                          }
                        }}
                        className="admin-products__action-button admin-products__action-button--delete"
                        title="Delete Product"
                      >
                        <Trash2 className="admin-products__action-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="admin-products__form">
          {formError && (
            <div className="admin-products__form-error">
              <AlertCircle className="admin-products__error-icon" />
              <span>{formError}</span>
            </div>
          )}

          <div className="admin-products__form-grid">
            <div>
              <label className="admin-products__form-label">Barcode</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="admin-products__form-input admin-products__form-input--barcode"
                required
              />
            </div>
            <div>
              <label className="admin-products__form-label">Category</label>
              <div className="admin-products__category-picker">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setIsCategoryMenuOpen(true); }}
                  onFocus={() => setIsCategoryMenuOpen(true)}
                  onBlur={() => setIsCategoryMenuOpen(false)}
                  className="admin-products__form-input"
                  autoComplete="off"
                  required
                />
                {isCategoryMenuOpen && matchingCategoryOptions.length > 0 && (
                  <div className="admin-products__category-menu" role="listbox" aria-label="Category options">
                    {matchingCategoryOptions.map((categoryOption) => (
                      <button
                        key={categoryOption}
                        type="button"
                        role="option"
                        aria-selected={category === categoryOption}
                        className="admin-products__category-option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => { setCategory(categoryOption); setIsCategoryMenuOpen(false); }}
                      >
                        {categoryOption}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="admin-products__form-label">Product Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-products__form-input"
              required
            />
          </div>

          <div>
            <label className="admin-products__form-label">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="admin-products__form-input"
            />
          </div>

          <div>
            <label className="admin-products__form-label">Expiration Date</label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="admin-products__form-input"
            />
          </div>

          <div className="admin-products__image-field">
            <label>Product Image</label>
            <label className="admin-products__image-upload">
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => handleImageFile(e.target.files?.[0])} />
              <span>{image ? 'Change image' : 'Upload image'}</span>
            </label>
            {image && <div className="admin-products__image-preview"><img src={image} alt="Product preview" onError={(event) => { event.currentTarget.style.display = 'none'; }} /><button className="admin-products__remove-image" type="button" title="Remove image" aria-label="Remove image" onClick={() => { setImage(''); if (imageInputRef.current) imageInputRef.current.value = ''; }}><X aria-hidden="true" /></button></div>}
          </div>

          <div className="admin-products__metrics-grid">
            <div>
              <label className="admin-products__form-label">Price (₱)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="admin-products__form-input admin-products__form-input--number"
                required
              />
            </div>
            <div>
              <label className="admin-products__form-label">Weight (g)</label>
              <input
                type="number"
                value={expectedWeightGrams}
                onChange={(e) => setExpectedWeightGrams(e.target.value)}
                className="admin-products__form-input admin-products__form-input--number"
                required
              />
            </div>
            <div>
              <label className="admin-products__form-label">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="admin-products__form-input admin-products__form-input--number"
                required
              />
            </div>
            <div>
              <label className="admin-products__form-label">Min Stock</label>
              <input
                type="number"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                className="admin-products__form-input admin-products__form-input--number"
                required
              />
            </div>
          </div>

          <div className="admin-products__form-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={<Check className="admin-products__submit-icon" />}
            >
              Save Product
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
