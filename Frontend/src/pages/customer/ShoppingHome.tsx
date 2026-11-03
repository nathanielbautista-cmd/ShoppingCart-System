import './ShoppingHome.css';
import React, { useMemo } from 'react';
import { Image as ImageIcon, Package } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { soundService } from '../../services/soundService';

interface ShoppingHomeProps {
  categoriesOpen: boolean;
  searchTerm: string;
}

export const ShoppingHome: React.FC<ShoppingHomeProps> = ({ categoriesOpen, searchTerm }) => {
  const { products, selectedProductCategory, setSelectedProductCategory, settings } = useCart();
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((product) => product.category))).filter(Boolean)],
    [products]
  );

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
    {categoriesOpen && <nav id="customer-category-bar" className="kiosk-home__primary kiosk-home__category-bar" aria-label="Product categories">
      {categories.map((category) => <button
        type="button"
        key={category}
        className={selectedProductCategory === category ? 'is-active' : ''}
        onClick={() => {
          soundService.playKeyClick();
          setSelectedProductCategory(category);
        }}
        aria-pressed={selectedProductCategory === category}
      >
        {category}
      </button>)}
    </nav>}

    <section className="kiosk-home__catalog" aria-label="Product catalog">
      {visibleProducts.length ? visibleProducts.map((product) => <article className="kiosk-home__product" key={product.id}>
        <div className="kiosk-home__product-icon">{product.image ? <img src={product.image} alt="" draggable={false} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <ImageIcon />}</div>
        <div className="kiosk-home__product-details"><small>{product.category}</small><strong>{product.name}</strong><span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></div>
        <b>{settings.currencySymbol}{product.price.toFixed(2)}</b>
      </article>) : <div className="kiosk-home__empty"><Package /><strong>{searchTerm ? 'No matching products' : 'No products in this category'}</strong><span>{searchTerm ? 'Try another product name, category, barcode, or aisle.' : 'Select another category from the sidebar.'}</span></div>}
    </section>
  </main>;
};
