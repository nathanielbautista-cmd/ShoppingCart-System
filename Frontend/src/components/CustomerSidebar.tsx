import './CustomerSidebar.css';
import React, { useEffect, useRef, useState } from 'react';
import { CircleHelp, LayoutGrid, Moon, Settings, ShoppingCart, Volume2, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { soundService } from '../services/soundService';

interface CustomerSidebarProps {
  categoriesOpen: boolean;
  onToggleCategories: () => void;
  onCloseCategories: () => void;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  categoriesOpen,
  onToggleCategories,
  onCloseCategories,
}) => {
  const { customerScreen, setCustomerScreen, settings, toggleVoice, updateSettings } = useCart();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setIsSettingsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSettingsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isSettingsOpen]);

  const goTo = (screen: 'BUDGET' | 'HELP') => {
    soundService.playKeyClick();
    onCloseCategories();
    setIsSettingsOpen(false);
    setCustomerScreen(screen);
  };

  const toggleCategories = () => {
    soundService.playKeyClick();
    setIsSettingsOpen(false);
    setCustomerScreen('SHOPPING_HOME');
    onToggleCategories();
  };

  const toggleSettings = () => {
    soundService.playKeyClick();
    onCloseCategories();
    setIsSettingsOpen((open) => !open);
  };

  return <aside className="customer-sidebar" aria-label="Shopping navigation">
    <div className="customer-sidebar__logo">
      <span className={settings.storeLogo ? 'has-store-logo' : ''}>
        {settings.storeLogo ? <img src={settings.storeLogo} alt="" draggable={false} /> : <ShoppingCart />}
      </span>
      <strong>{settings.storeName}</strong>
    </div>

    <nav className="customer-sidebar__nav" aria-label="Customer menu">
      <button
        type="button"
        className={categoriesOpen ? 'is-active' : ''}
        onClick={toggleCategories}
        aria-expanded={categoriesOpen}
        aria-controls="customer-category-bar"
      >
        <LayoutGrid /><span>Categories</span>
      </button>
      <button
        type="button"
        className={customerScreen === 'BUDGET' ? 'is-active' : ''}
        onClick={() => goTo('BUDGET')}
      >
        <Wallet /><span>My Budget</span>
      </button>
      <button
        type="button"
        className={customerScreen === 'HELP' ? 'is-active' : ''}
        onClick={() => goTo('HELP')}
      >
        <CircleHelp /><span>Help</span>
      </button>
      <div className="customer-sidebar__settings-wrap" ref={settingsRef}>
        <button
          type="button"
          className={isSettingsOpen ? 'is-active' : ''}
          onClick={toggleSettings}
          aria-expanded={isSettingsOpen}
          aria-haspopup="dialog"
        >
          <Settings /><span>Settings</span>
        </button>

        {isSettingsOpen && <section className="customer-sidebar__settings-menu" role="dialog" aria-label="Customer settings">
          <header><strong>Settings</strong></header>
          <div className="customer-sidebar__setting-row">
            <span><Volume2 /><strong>Voice Assistance</strong></span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.voiceEnabled}
              className={`customer-sidebar__switch ${settings.voiceEnabled ? 'is-on' : ''}`}
              onClick={() => { soundService.playKeyClick(); toggleVoice(); }}
            >
              <span>{settings.voiceEnabled ? 'ON' : 'OFF'}</span><i />
            </button>
          </div>
          <div className="customer-sidebar__setting-row">
            <span><Moon /><strong>Dark Mode</strong></span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.theme === 'DARK'}
              className={`customer-sidebar__switch ${settings.theme === 'DARK' ? 'is-on' : ''}`}
              onClick={() => { soundService.playKeyClick(); updateSettings({ theme: settings.theme === 'DARK' ? 'LIGHT' : 'DARK' }); }}
            >
              <span>{settings.theme === 'DARK' ? 'ON' : 'OFF'}</span><i />
            </button>
          </div>
        </section>}
      </div>
    </nav>
  </aside>;
};
