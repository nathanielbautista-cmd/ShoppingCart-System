import './CustomerTopbar.css';
import React, { useEffect, useRef, useState } from 'react';
import { CircleHelp, Moon, Settings, ShoppingCart, Volume2, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getLoadCellStatus } from '../services/sensorService';
import { soundService } from '../services/soundService';

export const CustomerTopbar: React.FC = () => {
  const {
    cartItems,
    currentTotal,
    customerScreen,
    settings,
    setCustomerScreen,
    toggleVoice,
    updateSettings,
  } = useCart();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScaleDetailsOpen, setIsScaleDetailsOpen] = useState(false);
  const [scaleConnected, setScaleConnected] = useState<boolean | null>(null);
  const [scaleMessage, setScaleMessage] = useState('Checking load-cell connection...');
  const settingsRef = useRef<HTMLDivElement>(null);
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
    if (!isSettingsOpen && !isScaleDetailsOpen) return;

    const closePopovers = (event: PointerEvent) => {
      const target = event.target as Node;
      if (isSettingsOpen && !settingsRef.current?.contains(target)) {
        setIsSettingsOpen(false);
      }
      if (isScaleDetailsOpen && !scaleRef.current?.contains(target)) {
        setIsScaleDetailsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsScaleDetailsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closePopovers);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closePopovers);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isScaleDetailsOpen, isSettingsOpen]);

  const goTo = (screen: 'CART' | 'BUDGET' | 'HELP' | 'SHOPPING_HOME') => {
    soundService.playKeyClick();
    setIsSettingsOpen(false);
    setCustomerScreen(screen);
  };

  const handleSettingsToggle = () => {
    soundService.playKeyClick();
    setIsScaleDetailsOpen(false);
    setIsSettingsOpen((open) => !open);
  };

  const handleScaleDetailsToggle = () => {
    soundService.playKeyClick();
    setIsSettingsOpen(false);
    setIsScaleDetailsOpen((open) => !open);
  };

  const handleVoiceToggle = () => {
    soundService.playKeyClick();
    toggleVoice();
  };

  const handleDarkModeToggle = () => {
    soundService.playKeyClick();
    updateSettings({ theme: settings.theme === 'DARK' ? 'LIGHT' : 'DARK' });
  };

  return <header className="customer-topbar">
    <div className="customer-topbar__title"><strong>Shop products</strong><small>Choose a category</small></div>
    <nav aria-label="Customer actions">
      <div className="customer-topbar__scale-wrap" ref={scaleRef}>
        <button
          type="button"
          className={`customer-topbar__scale customer-topbar__scale--${scaleIndicatorState}`}
          aria-label={`${scaleStatusLabel}. Tap for scale details.`}
          aria-expanded={isScaleDetailsOpen}
          aria-haspopup="dialog"
          title={`${scaleStatusLabel}: ${scaleMessage}`}
          onClick={handleScaleDetailsToggle}
        >
          <i className="customer-topbar__scale-indicator" aria-hidden="true" />
        </button>
        {isScaleDetailsOpen && (
          <section className="customer-topbar__scale-details" role="dialog" aria-label="Scale status details">
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
          </section>
        )}
      </div>
      <button
        className={`customer-topbar__cart ${customerScreen === 'CART' ? 'customer-topbar__cart--open' : ''}`}
        onClick={() => goTo(customerScreen === 'CART' ? 'SHOPPING_HOME' : 'CART')}
        aria-expanded={customerScreen === 'CART'}
        aria-controls="customer-cart-sidebar"
      >
        <ShoppingCart /><span>My Cart</span>{quantity > 0 && <b>{quantity}</b>}<em>{settings.currencySymbol}{currentTotal.toFixed(2)}</em>
      </button>
      <button className="customer-topbar__budget" onClick={() => goTo('BUDGET')}><Wallet /><span>My Budget</span></button>
      <button className="customer-topbar__help" onClick={() => goTo('HELP')}><CircleHelp /><span>Help</span></button>
      <div className="customer-topbar__settings-wrap" ref={settingsRef}>
        <button
          type="button"
          className="customer-topbar__settings-button"
          onClick={handleSettingsToggle}
          aria-label="Settings"
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          title="Settings"
        >
          <Settings />
        </button>
        {isSettingsOpen && (
          <section className="customer-topbar__settings-menu" role="dialog" aria-label="Customer settings">
            <div className="customer-topbar__settings-heading">
              <strong>Settings</strong>
            </div>
            <div className="customer-topbar__setting-row">
              <span><Volume2 /><strong>Voice Assistance</strong></span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.voiceEnabled}
                className={`customer-topbar__switch ${settings.voiceEnabled ? 'customer-topbar__switch--on' : ''}`}
                onClick={handleVoiceToggle}
              >
                <span>{settings.voiceEnabled ? 'ON' : 'OFF'}</span>
                <i />
              </button>
            </div>
            <div className="customer-topbar__setting-row">
              <span><Moon /><strong>Dark Mode</strong></span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.theme === 'DARK'}
                className={`customer-topbar__switch ${settings.theme === 'DARK' ? 'customer-topbar__switch--on' : ''}`}
                onClick={handleDarkModeToggle}
              >
                <span>{settings.theme === 'DARK' ? 'ON' : 'OFF'}</span>
                <i />
              </button>
            </div>
          </section>
        )}
      </div>
    </nav>
  </header>;
};
