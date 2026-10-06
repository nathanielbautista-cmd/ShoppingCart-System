import './Header.css';
import React from 'react';
import { ShoppingCart, Shield, ArrowLeft, HelpCircle, Wallet, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { soundService } from '../services/soundService';

export const Header: React.FC = () => {
  const {
    userMode,
    customerScreen,
    setCustomerScreen,
    cartId,
    budget,
    currentTotal,
    remainingBudget,
    budgetState,
    cartItems,
    settings,
    hasSetBudget,
  } = useCart();

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const isWelcome = customerScreen === 'WELCOME';
  const showBackButton =
    !isWelcome &&
    userMode === 'CUSTOMER' &&
    customerScreen !== 'SHOPPING_HOME' &&
    customerScreen !== 'TRANSACTION_COMPLETE' &&
    customerScreen !== 'WAITING_FOR_CASHIER';

  const handleBack = () => {
    soundService.playKeyClick();
    if (customerScreen === 'BUDGET_SETUP') {
      setCustomerScreen('WELCOME');
    } else {
      setCustomerScreen('SHOPPING_HOME');
    }
  };

  const handleOpenBudget = () => {
    soundService.playKeyClick();
    setCustomerScreen('BUDGET');
  };

  const handleOpenCart = () => {
    soundService.playKeyClick();
    setCustomerScreen('CART');
  };

  const handleOpenHelp = () => {
    soundService.playKeyClick();
    setCustomerScreen('HELP');
  };

  const handleOpenSearch = () => {
    soundService.playKeyClick();
    setCustomerScreen('SEARCH_PRODUCTS');
  };

  return (
    <header className="header__item-1">
      {/* Left zone: Brand and Cart ID */}
      <div className="header__item-2">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="header__item-3"
            aria-label="Back"
          >
            <ArrowLeft className="header__item-4" />
          </button>
        )}

        <div className="header__item-5">
          <div className="header__item-6">
            <ShoppingCart className="header__item-7" />
          </div>
          <div className="header__item-8">
            <div className="header__item-9">
              <span className="header__item-10">
                iCart
              </span>
              <span className="header__item-11">
                {cartId}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right zone: Live Budget / Subtotal & Controls */}
      <div className="header__item-12">
        {userMode === 'CUSTOMER' && !isWelcome && hasSetBudget && (
          <button
            onClick={handleOpenBudget}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              budgetState === 'EXCEEDED'
                ? 'bg-rose-950/50 border-rose-500/50 text-rose-300 hover:bg-rose-900/50'
                : budgetState === 'WARNING'
                ? 'bg-amber-950/50 border-amber-500/50 text-amber-300 hover:bg-amber-900/50'
                : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wallet className="header__item-13" />
            <span className="header__item-14">
              {settings.currencySymbol}{currentTotal.toFixed(0)} <span className="header__item-15">/</span> {settings.currencySymbol}{budget.toFixed(0)}
            </span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-black tabular-nums ${
                remainingBudget < 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {remainingBudget >= 0 ? `+${remainingBudget.toFixed(0)}` : remainingBudget.toFixed(0)}
            </span>
          </button>
        )}

        {/* Live Cart Quick Button */}
        {userMode === 'CUSTOMER' && !isWelcome && hasSetBudget && customerScreen !== 'CART' && customerScreen !== 'SHOPPING_HOME' && (
          <button
            onClick={handleOpenCart}
            className="header__item-16"
          >
            <ShoppingCart className="header__item-17" />
            <span className="header__item-18">{totalQuantity}</span>
          </button>
        )}

        {/* Search button for customers */}
        {userMode === 'CUSTOMER' && !isWelcome && hasSetBudget && customerScreen !== 'SEARCH_PRODUCTS' && (
          <button
            onClick={handleOpenSearch}
            className="header__item-19"
            title="Search Products & Stock"
          >
            <Search className="header__item-20" />
          </button>
        )}

        {/* Help button for customers */}
        {userMode === 'CUSTOMER' && hasSetBudget && customerScreen !== 'HELP' && (
          <button
            onClick={handleOpenHelp}
            className="header__item-21"
            title="Help & Guide"
          >
            <HelpCircle className="header__item-22" />
          </button>
        )}

        {/* Admin mode badge */}
        {userMode === 'ADMIN' && (
          <div className="header__item-23">
            <Shield className="header__item-24" />
            <span>ADMIN MODE</span>
          </div>
        )}
      </div>
    </header>
  );
};
