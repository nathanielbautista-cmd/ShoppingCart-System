import './CustomerTopbar.css';
import React, { useEffect, useRef, useState } from 'react';
import { CircleHelp, Moon, Settings, ShoppingCart, Volume2, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { soundService } from '../services/soundService';

export const CustomerTopbar: React.FC = () => {
  const {
    cartItems,
    currentTotal,
    settings,
    setCustomerScreen,
    toggleVoice,
    updateSettings,
  } = useCart();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const quantity = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const closeSettings = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSettingsOpen(false);
    };

    document.addEventListener('pointerdown', closeSettings);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeSettings);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isSettingsOpen]);

  const goTo = (screen: 'CART' | 'BUDGET' | 'HELP') => {
    soundService.playKeyClick();
    setIsSettingsOpen(false);
    setCustomerScreen(screen);
  };

  const handleSettingsToggle = () => {
    soundService.playKeyClick();
    setIsSettingsOpen((open) => !open);
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
      <button className="customer-topbar__cart" onClick={() => goTo('CART')}><ShoppingCart /><span>My Cart</span>{quantity > 0 && <b>{quantity}</b>}<em>{settings.currencySymbol}{currentTotal.toFixed(2)}</em></button>
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
