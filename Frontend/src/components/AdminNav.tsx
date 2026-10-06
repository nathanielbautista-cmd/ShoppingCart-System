import './AdminNav.css';
import React from 'react';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  BarChart3,
  Radio,
  Settings,
  LogOut,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { AdminScreen } from '../types';

export const AdminNav: React.FC = () => {
  const { adminScreen, setAdminScreen, logoutAdmin } = useCart();

  const navItems: { screen: AdminScreen; label: string; icon: React.ReactNode }[] = [
    { screen: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="admin-nav__item-1" /> },
    { screen: 'PRODUCTS', label: 'Products', icon: <Package className="admin-nav__item-2" /> },
    { screen: 'INVENTORY', label: 'Inventory', icon: <Boxes className="admin-nav__item-3" /> },
    { screen: 'TRANSACTIONS', label: 'Transactions', icon: <Receipt className="admin-nav__item-4" /> },
    { screen: 'REPORTS', label: 'Reports', icon: <BarChart3 className="admin-nav__item-5" /> },
    { screen: 'CART_MONITORING', label: 'Carts Live', icon: <Radio className="admin-nav__item-6" /> },
    { screen: 'SETTINGS', label: 'Settings', icon: <Settings className="admin-nav__item-7" /> },
  ];

  return (
    <aside className="w-56 h-full shrink-0 select-none border-r shadow-sm flex flex-col bg-slate-900 text-slate-200 border-slate-800">
      <div className="px-4 py-4 border-b flex items-center gap-2 border-slate-800">
        <h3 className="admin-nav__item-8">Admin</h3>
      </div>

      <nav className="admin-nav__item-9">
        {navItems.map((item) => {
          const isActive = adminScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setAdminScreen(item.screen)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="admin-nav__item-10">{item.icon}</span>
              <span className="admin-nav__item-11">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-800">
        <button
          onClick={logoutAdmin}
          className="admin-nav__item-12"
        >
          <LogOut className="admin-nav__item-13" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
