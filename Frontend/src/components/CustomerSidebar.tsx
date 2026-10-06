import './CustomerSidebar.css';
import React, { useMemo } from 'react';
import { LayoutGrid, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { soundService } from '../services/soundService';

export const CustomerSidebar: React.FC = () => {
  const { products, selectedProductCategory, setSelectedProductCategory, setCustomerScreen } = useCart();
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((product) => product.category))).filter(Boolean)], [products]);

  const selectCategory = (category: string) => {
    soundService.playKeyClick();
    setSelectedProductCategory(category);
    setCustomerScreen('SHOPPING_HOME');
  };

  return <aside className="customer-sidebar" aria-label="Shopping navigation">
    <div className="customer-sidebar__logo"><span><ShoppingCart /></span><strong>iCart</strong></div>
    <div className="customer-sidebar__heading"><LayoutGrid /><span>Categories</span></div>
    <nav className="customer-sidebar__nav" aria-label="Product categories">
      {categories.map((category) => <button key={category} className={selectedProductCategory === category ? 'is-active' : ''} onClick={() => selectCategory(category)}>
        <span>{category}</span>
      </button>)}
    </nav>
  </aside>;
};
