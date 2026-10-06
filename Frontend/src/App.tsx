import './App.css';
import './design.css';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { Header } from './components/Header';
import { CustomerSidebar } from './components/CustomerSidebar';
import { CustomerTopbar } from './components/CustomerTopbar';
import ScannerInput from './components/ScannerInput';
import { AdminNav } from './components/AdminNav';
import { HardwareButtonBridge } from './components/HardwareButtonBridge';

// Customer Pages
import { Welcome } from './pages/customer/Welcome';
import { BudgetSetup } from './pages/customer/BudgetSetup';
import { ShoppingHome } from './pages/customer/ShoppingHome';
import { ProductVerification } from './pages/customer/ProductVerification';
import { Cart } from './pages/customer/Cart';
import { Budget } from './pages/customer/Budget';
import { RemoveItem } from './pages/customer/RemoveItem';
import { CheckoutReview } from './pages/customer/CheckoutReview';
import { WaitingForCashier } from './pages/customer/WaitingForCashier';
import { TransactionComplete } from './pages/customer/TransactionComplete';
import { Help } from './pages/customer/Help';
import { SearchProducts } from './pages/customer/SearchProducts';

// Admin Pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminInventory } from './pages/admin/AdminInventory';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminCartMonitoring } from './pages/admin/AdminCartMonitoring';
import { AdminSettings } from './pages/admin/AdminSettings';

const AppContent: React.FC = () => {
  const { userMode, customerScreen, adminScreen, settings, hasSetBudget } = useCart();
  const [powered, setPowered] = useState(true);

  useEffect(() => {
    const onHardware = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      if (action === 'power_on') setPowered(true);
      if (action === 'power_off') setPowered(false);
      if (action === 'restart') window.location.reload();
    };
    window.addEventListener('icart-hardware', onHardware);
    return () => window.removeEventListener('icart-hardware', onHardware);
  }, []);

  const renderCustomerScreen = () => {
    switch (customerScreen) {
      case 'WELCOME':
        return <Welcome />;
      case 'BUDGET_SETUP':
        return <BudgetSetup />;
      case 'SHOPPING_HOME':
        return <ShoppingHome />;
      case 'PRODUCT_VERIFICATION':
        return <ProductVerification />;
      case 'CART':
        return <Cart />;
      case 'BUDGET':
        return <Budget />;
      case 'REMOVE_ITEM':
        return <RemoveItem />;
      case 'CHECKOUT_REVIEW':
        return <CheckoutReview />;
      case 'WAITING_FOR_CASHIER':
        return <WaitingForCashier />;
      case 'TRANSACTION_COMPLETE':
        return <TransactionComplete />;
      case 'HELP':
        return <Help />;
      case 'SEARCH_PRODUCTS':
        return <SearchProducts />;
      default:
        return <Welcome />;
    }
  };

  const renderAdminScreen = () => {
    if (adminScreen === 'LOGIN') {
      return <AdminLogin />;
    }

    return (
      <div className="admin-layout flex h-full overflow-hidden bg-slate-950 text-slate-100">
        <AdminNav />
        <div className="app__item-1 admin-page">
          {adminScreen === 'DASHBOARD' && <AdminDashboard />}
          {adminScreen === 'PRODUCTS' && <AdminProducts />}
          {adminScreen === 'INVENTORY' && <AdminInventory />}
          {adminScreen === 'TRANSACTIONS' && <AdminTransactions />}
          {adminScreen === 'REPORTS' && <AdminReports />}
          {adminScreen === 'CART_MONITORING' && <AdminCartMonitoring />}
          {adminScreen === 'SETTINGS' && <AdminSettings />}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden font-sans select-none ${userMode === 'ADMIN' || settings.theme === 'DARK' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} ${userMode === 'CUSTOMER' && settings.theme === 'DARK' ? 'customer-theme-dark' : ''}`}>
      <HardwareButtonBridge />
      {!powered ? <div className="flex-1 grid place-items-center bg-black text-slate-500">iCart is powered off</div> : <>
      {/* Main Touchscreen Stage */}
      <main className={`flex-1 overflow-hidden ${userMode === 'ADMIN' || settings.theme === 'DARK' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div
          className="flex h-full w-full flex-col overflow-hidden relative"
        >
          {/* The compact customer sidebar provides kiosk navigation; admin keeps its header. */}
          {userMode === 'ADMIN' && adminScreen !== 'LOGIN' ? (
            <Header />
          ) : null}

          {/* Scanner input listens globally for keyboard-HID scans */}
          <ScannerInput />

          {/* Screen Content Container */}
          <div className={`app__item-5 ${userMode === 'CUSTOMER' ? 'kiosk-customer-layout' : ''}`}>
            {userMode === 'CUSTOMER' && hasSetBudget && <CustomerSidebar />}
            <div className="kiosk-customer-content">
              {userMode === 'CUSTOMER' && hasSetBudget && <CustomerTopbar />}
              <div className="kiosk-customer-page">{userMode === 'CUSTOMER' ? renderCustomerScreen() : renderAdminScreen()}</div>
            </div>
          </div>
        </div>
      </main></>}
    </div>
  );
};

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
