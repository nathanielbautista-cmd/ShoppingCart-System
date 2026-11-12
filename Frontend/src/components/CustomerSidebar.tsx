import './CustomerSidebar.css';
import React, { useEffect, useRef, useState } from 'react';
import { CircleHelp, LayoutGrid, Moon, Settings, ShoppingCart, Sun, Wallet } from 'lucide-react';
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
  const {
    customerScreen,
    setCustomerScreen,
    settings,
    updateSettings,
  } = useCart();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [settingsOpen]);

  const goTo = (screen: 'BUDGET' | 'HELP') => {
    soundService.playKeyClick();
    setSettingsOpen(false);
    onCloseCategories();
    setCustomerScreen(screen);
  };

  const toggleCategories = () => {
    setSettingsOpen(false);
    soundService.playKeyClick();
    setCustomerScreen('SHOPPING_HOME');
    onToggleCategories();
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
          className={settingsOpen ? 'is-active' : ''}
          aria-expanded={settingsOpen}
          aria-haspopup="dialog"
          onClick={() => {
            soundService.playKeyClick();
            onCloseCategories();
            setSettingsOpen((open) => !open);
          }}
        >
          <Settings /><span>Settings</span>
        </button>
        {settingsOpen && <section className="customer-sidebar__settings-menu" role="dialog" aria-label="Settings">
          <header><strong>Settings</strong></header>
          <div className="customer-sidebar__setting-row">
            <span>{settings.theme === 'DARK' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}<strong>Display theme</strong></span>
            <button
              type="button"
              className={`customer-sidebar__switch${settings.theme === 'DARK' ? ' is-on' : ''}`}
              aria-label={`Switch to ${settings.theme === 'DARK' ? 'light' : 'dark'} theme`}
              onClick={() => updateSettings({ theme: settings.theme === 'DARK' ? 'LIGHT' : 'DARK' })}
            >
              <span>{settings.theme === 'DARK' ? 'Dark' : 'Light'}</span><i />
            </button>
          </div>
        </section>}
      </div>
    </nav>

  </aside>;
};
