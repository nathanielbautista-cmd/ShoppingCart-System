import './AdminInventory.css';
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

type StockFilter = 'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export const AdminInventory: React.FC = () => {
  const { products, adjustInventory } = useCart();
  const [filter, setFilter] = useState<StockFilter>('ALL');

  const filteredProducts = products.filter((p) => {
    if (filter === 'OUT_OF_STOCK') return p.stock === 0;
    if (filter === 'LOW_STOCK') return p.stock > 0 && p.stock <= p.minimumStock;
    if (filter === 'AVAILABLE') return p.stock > p.minimumStock;
    return true;
  });

  const handleQuickRestock = async (productId: string, amount: number) => {
    try {
      await adjustInventory(productId, amount);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to update inventory.');
    }
  };

  return (
    <div className="admin-inventory__item-1">
      {/* Top row */}
      <div className="admin-inventory__item-2">
        <div>
          <h2 className="admin-inventory__item-3">Inventory Stock</h2>
        </div>

        {/* Filter Tabs */}
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

      {/* Inventory Table */}
      <div className="admin-inventory__item-5">
        <table className="admin-inventory__item-6">
          <thead className="admin-inventory__item-7">
            <tr>
              <th className="admin-inventory__item-8">Product</th>
              <th className="admin-inventory__item-9">Current Stock</th>
              <th className="admin-inventory__item-10">Minimum Stock</th>
              <th className="admin-inventory__item-11">Status</th>
              <th className="admin-inventory__item-12">Quick Restock</th>
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
                        onClick={() => handleQuickRestock(p.id, 10)}
                        className="admin-inventory__item-30"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleQuickRestock(p.id, 50)}
                        className="admin-inventory__item-31"
                      >
                        +50
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
