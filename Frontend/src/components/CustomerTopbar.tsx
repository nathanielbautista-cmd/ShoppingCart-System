import './CustomerTopbar.css';
import React, { useEffect } from 'react';
import { Search, ShoppingCart, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { BARCODE_CAPTURED_EVENT } from '../services/scannerEvents';
import { soundService } from '../services/soundService';

interface CustomerTopbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export const CustomerTopbar: React.FC<CustomerTopbarProps> = ({ searchTerm, onSearchTermChange }) => {
  const {
    cartItems,
    currentTotal,
    customerScreen,
    settings,
    setCustomerScreen,
  } = useCart();
  const quantity = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const clearScannedBarcode = () => onSearchTermChange('');
    window.addEventListener(BARCODE_CAPTURED_EVENT, clearScannedBarcode);
    return () => window.removeEventListener(BARCODE_CAPTURED_EVENT, clearScannedBarcode);
  }, [onSearchTermChange]);

  const openCart = () => {
    soundService.playKeyClick();
    setCustomerScreen('CART');
  };

  return <>
    <header className={`customer-topbar ${customerScreen === 'CART' ? 'customer-topbar--cart-open' : ''}`}>
      <div className="customer-topbar__search" role="search">
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="customer-topbar-search">Search products</label>
        <input
          id="customer-topbar-search"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search product"
          autoComplete="off"
          data-barcode-capture
        />
        {searchTerm && <button type="button" onClick={() => onSearchTermChange('')} aria-label="Clear product search"><X /></button>}
      </div>

    </header>

    {customerScreen !== 'CART' && <button
      type="button"
      className="customer-floating-cart"
      onClick={openCart}
      aria-label={`Open cart. ${quantity} items. Total ${settings.currencySymbol}${currentTotal.toFixed(2)}`}
      aria-controls="customer-cart-sidebar"
    >
      <ShoppingCart aria-hidden="true" />
      <strong>{settings.currencySymbol}{currentTotal.toFixed(2)}</strong>
    </button>}
  </>;
};
