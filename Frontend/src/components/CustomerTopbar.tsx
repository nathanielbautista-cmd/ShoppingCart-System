import './CustomerTopbar.css';
import React, { useEffect, useRef, useState } from 'react';
import { Search, ShoppingCart, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getLoadCellStatus } from '../services/sensorService';
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
  const [isScaleDetailsOpen, setIsScaleDetailsOpen] = useState(false);
  const [scaleConnected, setScaleConnected] = useState<boolean | null>(null);
  const [scaleMessage, setScaleMessage] = useState('Checking load-cell connection...');
  const scaleRef = useRef<HTMLDivElement>(null);
  const quantity = cartItems.reduce((total, item) => total + item.quantity, 0);
  const normalizedScaleMessage = scaleMessage.toLowerCase();
  const scaleIndicatorState = scaleConnected === null
    ? 'checking'
    : scaleConnected
      ? 'ready'
      : normalizedScaleMessage.includes('stale')
        ? 'stale'
        : normalizedScaleMessage.includes('no hx711') ||
            normalizedScaleMessage.includes('no load-cell') ||
            normalizedScaleMessage.includes('no reading')
          ? 'no-data'
          : 'error';
  const scaleStatusLabel = scaleIndicatorState === 'ready'
    ? 'Scale ready'
    : scaleIndicatorState === 'checking'
      ? 'Checking scale connection'
      : scaleIndicatorState === 'stale'
        ? 'Scale reading is stale'
        : scaleIndicatorState === 'no-data'
          ? 'No scale data'
          : 'Scale connection error';

  useEffect(() => {
    let cancelled = false;
    const refreshScaleStatus = async () => {
      try {
        const status = await getLoadCellStatus();
        if (cancelled) return;
        setScaleConnected(status.connected);
        setScaleMessage(status.message);
      } catch (error) {
        if (cancelled) return;
        setScaleConnected(false);
        setScaleMessage(error instanceof Error ? error.message : 'Load-cell status is unavailable.');
      }
    };

    void refreshScaleStatus();
    const intervalId = window.setInterval(refreshScaleStatus, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const clearScannedBarcode = () => onSearchTermChange('');
    window.addEventListener(BARCODE_CAPTURED_EVENT, clearScannedBarcode);
    return () => window.removeEventListener(BARCODE_CAPTURED_EVENT, clearScannedBarcode);
  }, [onSearchTermChange]);

  useEffect(() => {
    if (!isScaleDetailsOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!scaleRef.current?.contains(event.target as Node)) setIsScaleDetailsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsScaleDetailsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isScaleDetailsOpen]);

  const openCart = () => {
    soundService.playKeyClick();
    setCustomerScreen('CART');
  };

  return <>
    <header className="customer-topbar">
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

      <div className="customer-topbar__scale-wrap" ref={scaleRef}>
        <button
          type="button"
          className={`customer-topbar__scale customer-topbar__scale--${scaleIndicatorState}`}
          aria-label={`${scaleStatusLabel}. Tap for scale details.`}
          aria-expanded={isScaleDetailsOpen}
          aria-haspopup="dialog"
          title={`${scaleStatusLabel}: ${scaleMessage}`}
          onClick={() => { soundService.playKeyClick(); setIsScaleDetailsOpen((open) => !open); }}
        >
          <i className="customer-topbar__scale-indicator" aria-hidden="true" />
        </button>
        {isScaleDetailsOpen && <section className="customer-topbar__scale-details" role="dialog" aria-label="Scale status details">
          <div className="customer-topbar__scale-details-heading">
            <i className={`customer-topbar__legend-dot customer-topbar__legend-dot--${scaleIndicatorState}`} />
            <strong>{scaleStatusLabel}</strong>
          </div>
          <p>{scaleMessage}</p>
          <div className="customer-topbar__scale-legend" aria-label="Scale status color guide">
            <span><i className="customer-topbar__legend-dot customer-topbar__legend-dot--ready" />Ready</span>
            <span><i className="customer-topbar__legend-dot customer-topbar__legend-dot--checking" />Checking</span>
            <span><i className="customer-topbar__legend-dot customer-topbar__legend-dot--stale" />Stale reading</span>
            <span><i className="customer-topbar__legend-dot customer-topbar__legend-dot--no-data" />No data/service</span>
            <span><i className="customer-topbar__legend-dot customer-topbar__legend-dot--error" />Connection error</span>
          </div>
        </section>}
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
