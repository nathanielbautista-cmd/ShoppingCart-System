import './AdminInventory.css';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../../context/CartContext';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, PackagePlus, RefreshCw, X, XCircle } from 'lucide-react';
import { Product } from '../../types';

type StockFilter = 'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export const AdminInventory: React.FC = () => {
  const { products, adjustInventory } = useCart();
  const [filter, setFilter] = useState<StockFilter>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredProducts = products.filter((p) => {
    if (filter === 'OUT_OF_STOCK') return p.stock === 0;
    if (filter === 'LOW_STOCK') return p.stock > 0 && p.stock <= p.minimumStock;
    if (filter === 'AVAILABLE') return p.stock > p.minimumStock;
    return true;
  });

  const parsedAmount = Number(restockAmount);
  const amountIsValid = Number.isInteger(parsedAmount) && parsedAmount > 0;
  const stockAfterRestock = selectedProduct && amountIsValid
    ? selectedProduct.stock + parsedAmount
    : selectedProduct?.stock ?? 0;
  const amountToMinimum = selectedProduct
    ? Math.max(0, selectedProduct.minimumStock - selectedProduct.stock)
    : 0;

  useEffect(() => {
    if (!selectedProduct) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRestocking) setSelectedProduct(null);
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedProduct, isRestocking]);

  const openRestock = (product: Product) => {
    const suggestedAmount = Math.max(product.minimumStock - product.stock, 10);
    setSelectedProduct(product);
    setRestockAmount(String(suggestedAmount));
    setNotice(null);
  };

  const closeRestock = () => {
    if (isRestocking) return;
    setSelectedProduct(null);
    setRestockAmount('');
  };

  const handleQuickRestock = async () => {
    if (!selectedProduct || !amountIsValid) {
      setNotice({ type: 'error', text: 'Enter a valid whole number greater than zero.' });
      return;
    }

    setIsRestocking(true);
    setNotice(null);
    try {
      await adjustInventory(selectedProduct.id, parsedAmount);
      setNotice({
        type: 'success',
        text: `${parsedAmount} units added to ${selectedProduct.name}. New stock: ${stockAfterRestock}.`,
      });
      setSelectedProduct(null);
      setRestockAmount('');
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to update inventory.',
      });
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <div className="admin-inventory__item-1">

      <div className="admin-inventory__item-2">
        <div>
          <h2 className="admin-inventory__item-3">Inventory Stock</h2>
        </div>


        <div className="admin-inventory__item-4">
          {(['ALL', 'AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'] as StockFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className={`admin-inventory__notice admin-inventory__notice--${notice.type}`} role="status">
          {notice.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X /></button>
        </div>
      )}


      <div className="admin-inventory__item-5">
        <table className="admin-inventory__item-6">
          <thead className="admin-inventory__item-7">
            <tr>
              <th className="admin-inventory__item-8">Product</th>
              <th className="admin-inventory__item-9">Current Stock</th>
              <th className="admin-inventory__item-10">Minimum Stock</th>
              <th className="admin-inventory__item-11">Status</th>
              <th className="admin-inventory__item-12">Adjust Stock</th>
            </tr>
          </thead>
          <tbody className="admin-inventory__item-13">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.stock === 0;
              const isLowStock = !isOutOfStock && p.stock <= p.minimumStock;

              return (
                <tr key={p.id} className="admin-inventory__item-14">
                  <td className="admin-inventory__item-15">
                    <div className="admin-inventory__item-16">{p.name}</div>
                    <div className="admin-inventory__item-17">{p.barcode}</div>
                  </td>

                  <td className="admin-inventory__item-18">
                    <span
                      className={
                        isOutOfStock
                          ? 'text-rose-600'
                          : isLowStock
                          ? 'text-amber-700'
                          : 'text-slate-900'
                      }
                    >
                      {p.stock}
                    </span>{' '}
                    <span className="admin-inventory__item-19">units</span>
                  </td>

                  <td className="admin-inventory__item-20">
                    {p.minimumStock} units
                  </td>

                  <td className="admin-inventory__item-21">
                    {isOutOfStock ? (
                      <span className="admin-inventory__item-22">
                        <XCircle className="admin-inventory__item-23" />
                        <span>Out of Stock</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="admin-inventory__item-24">
                        <AlertTriangle className="admin-inventory__item-25" />
                        <span>Low Stock</span>
                      </span>
                    ) : (
                      <span className="admin-inventory__item-26">
                        <CheckCircle2 className="admin-inventory__item-27" />
                        <span>Available</span>
                      </span>
                    )}
                  </td>

                  <td className="admin-inventory__item-28">
                    <div className="admin-inventory__item-29">
                      <button
                        onClick={() => openRestock(p)}
                        className="admin-inventory__restock-button"
                      >
                        <PackagePlus /> Restock
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedProduct && createPortal(
        <div className="inventory-restock__backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeRestock();
        }}>
          <section className="inventory-restock" role="dialog" aria-modal="true" aria-labelledby="inventory-restock-title">
            <header className="inventory-restock__header">
              <div className="inventory-restock__icon"><PackagePlus /></div>
              <div>
                <h2 id="inventory-restock-title">Restock product</h2>
                <p>{selectedProduct.name}</p>
              </div>
              <button type="button" onClick={closeRestock} disabled={isRestocking} aria-label="Close restock dialog"><X /></button>
            </header>

            <div className="inventory-restock__body">
              <div className="inventory-restock__stock-summary">
                <div><span>Current stock</span><strong>{selectedProduct.stock}</strong></div>
                <ArrowRight />
                <div className="inventory-restock__new-stock"><span>New stock</span><strong>{stockAfterRestock}</strong></div>
                <div><span>Minimum stock</span><strong>{selectedProduct.minimumStock}</strong></div>
              </div>

              <div className="inventory-restock__section">
                <span className="inventory-restock__label">Quick amounts</span>
                <div className="inventory-restock__presets">
                  {[10, 25, 50].map((amount) => (
                    <button
                      type="button"
                      key={amount}
                      className={restockAmount === String(amount) ? 'is-selected' : ''}
                      onClick={() => { setRestockAmount(String(amount)); setNotice(null); }}
                    >
                      +{amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={amountToMinimum > 0 && restockAmount === String(amountToMinimum) ? 'is-selected' : ''}
                    onClick={() => { setRestockAmount(String(amountToMinimum)); setNotice(null); }}
                    disabled={amountToMinimum === 0}
                  >
                    To minimum{amountToMinimum > 0 ? ` (+${amountToMinimum})` : ''}
                  </button>
                </div>
              </div>

              <label className="inventory-restock__custom">
                <span>Custom quantity</span>
                <div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={restockAmount}
                    onChange={(event) => { setRestockAmount(event.target.value); setNotice(null); }}
                    autoFocus
                  />
                  <span>units</span>
                </div>
              </label>

              {!amountIsValid && restockAmount !== '' && (
                <p className="inventory-restock__validation"><AlertCircle />Enter a whole number greater than zero.</p>
              )}
            </div>

            <footer className="inventory-restock__footer">
              <button type="button" className="inventory-restock__cancel" onClick={closeRestock} disabled={isRestocking}>Cancel</button>
              <button type="button" className="inventory-restock__confirm" onClick={() => void handleQuickRestock()} disabled={!amountIsValid || isRestocking}>
                {isRestocking ? <RefreshCw className="is-spinning" /> : <PackagePlus />}
                {isRestocking ? 'Updating stock...' : `Confirm +${amountIsValid ? parsedAmount : 0}`}
              </button>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
};
