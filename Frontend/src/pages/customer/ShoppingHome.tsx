import './ShoppingHome.css';
import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Package, Search, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const ShoppingHome: React.FC = () => {
  const { products, selectedProductCategory, settings } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const visibleProducts = useMemo(
    () => {
      const query = searchTerm.trim().toLowerCase();

      return products.filter((product) => {
        const matchesCategory = selectedProductCategory === 'All' || product.category === selectedProductCategory;
        const matchesSearch = !query || [product.name, product.category, product.barcode, product.aisleLocation]
          .some((value) => value?.toLowerCase().includes(query));

        return matchesCategory && matchesSearch;
      });
    },
    [products, searchTerm, selectedProductCategory]
  );

  return <main className="kiosk-home">
    <section className="kiosk-home__primary" role="search" aria-label="Search products">
      <Search aria-hidden="true" />
      <label className="sr-only" htmlFor="kiosk-product-search">Search products</label>
      <input
        id="kiosk-product-search"
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search products, category, barcode, or aisle..."
        autoComplete="off"
      />
      {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear product search"><X /></button>}
    </section>

    <section className="kiosk-home__catalog" aria-label="Product catalog">
      {visibleProducts.length ? visibleProducts.map((product) => <article className="kiosk-home__product" key={product.id}>
        <div className="kiosk-home__product-icon">{product.image ? <img src={product.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <ImageIcon />}</div>
        <div className="kiosk-home__product-details"><small>{product.category}</small><strong>{product.name}</strong><span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></div>
        <b>{settings.currencySymbol}{product.price.toFixed(2)}</b>
      </article>) : <div className="kiosk-home__empty"><Package /><strong>{searchTerm ? 'No matching products' : 'No products in this category'}</strong><span>{searchTerm ? 'Try another product name, category, barcode, or aisle.' : 'Select another category from the sidebar.'}</span></div>}
    </section>
  </main>;
};
