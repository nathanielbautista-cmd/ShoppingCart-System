import './CustomerSidebar.css';
import React from 'react';
import { CircleHelp, LayoutGrid, Moon, ShoppingCart, Sun, Wallet } from 'lucide-react';
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
  const { customerScreen, setCustomerScreen, settings, updateSettings } = useCart();

  const goTo = (screen: 'BUDGET' | 'HELP') => {
    soundService.playKeyClick();
    onCloseCategories();
    setCustomerScreen(screen);
  };

  const toggleCategories = () => {
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
      <button
        type="button"
        aria-label={`Switch to ${settings.theme === 'DARK' ? 'light' : 'dark'} mode`}
        aria-pressed={settings.theme === 'DARK'}
        onClick={() => {
          soundService.playKeyClick();
          updateSettings({ theme: settings.theme === 'DARK' ? 'LIGHT' : 'DARK' });
        }}
      >
        {settings.theme === 'DARK' ? <Sun /> : <Moon />}
        <span>{settings.theme === 'DARK' ? 'Light mode' : 'Dark mode'}</span>
      </button>
    </nav>

  </aside>;
};
