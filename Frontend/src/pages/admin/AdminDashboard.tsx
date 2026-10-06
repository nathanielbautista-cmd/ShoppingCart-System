import './AdminDashboard.css';
import React from 'react';
import {
  Package,
  AlertTriangle,
  PhilippinePeso,
  Radio,
  ArrowRight,
  TrendingUp,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    transactions,
    monitoredCarts,
    setAdminScreen,
    settings,
  } = useCart();

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.stock <= p.minimumStock).length;
  const todaySales = transactions.reduce((acc, tx) => acc + tx.total, 0);
  const activeCartsCount = monitoredCarts.filter(
    (c) => c.status === 'SHOPPING' || c.status === 'WAITING FOR CASHIER'
  ).length;

  return (
    <div className="admin-dashboard__item-1">
      {/* Title */}
      <div className="admin-dashboard__item-2">
        <h2 className="admin-dashboard__item-3">Icart Store</h2>
      </div>

      {/* 4 Metric Cards */}
      <div className="admin-dashboard__item-4">
        <div
          onClick={() => setAdminScreen('PRODUCTS')}
          className="admin-dashboard__item-5"
        >
          <div className="admin-dashboard__item-6">
            <span className="admin-dashboard__item-7">Total Products</span>
            <Package className="admin-dashboard__item-8" />
          </div>
          <div className="admin-dashboard__item-9">
            {totalProducts}
          </div>
          <span className="admin-dashboard__item-10">
            <span>Manage Catalog</span>
            <ArrowRight className="admin-dashboard__item-11" />
          </span>
        </div>

        <div
          onClick={() => setAdminScreen('INVENTORY')}
          className="admin-dashboard__item-12"
        >
          <div className="admin-dashboard__item-13">
            <span className="admin-dashboard__item-14">Low Stock Items</span>
            <AlertTriangle className="admin-dashboard__item-15" />
          </div>
          <div className="admin-dashboard__item-16">
            {lowStockCount}
          </div>
          <span className="admin-dashboard__item-17">
            <span>Restock Notice</span>
            <ArrowRight className="admin-dashboard__item-18" />
          </span>
        </div>

        <div
          onClick={() => setAdminScreen('TRANSACTIONS')}
          className="admin-dashboard__item-19"
        >
          <div className="admin-dashboard__item-20">
            <span className="admin-dashboard__item-21">Today&apos;s Sales</span>
            <PhilippinePeso className="admin-dashboard__item-22" />
          </div>
          <div className="admin-dashboard__item-23">
            {settings.currencySymbol}{todaySales.toFixed(0)}
          </div>
          <span className="admin-dashboard__item-24">
            {transactions.length} verified transactions
          </span>
        </div>

        <div
          onClick={() => setAdminScreen('CART_MONITORING')}
          className="admin-dashboard__item-25"
        >
          <div className="admin-dashboard__item-26">
            <span className="admin-dashboard__item-27">Active Carts</span>
            <Radio className="admin-dashboard__item-28" />
          </div>
          <div className="admin-dashboard__item-29">
            {activeCartsCount}
          </div>
          <span className="admin-dashboard__item-30">
            <span>Live Monitoring</span>
            <ArrowRight className="admin-dashboard__item-31" />
          </span>
        </div>
      </div>

      {/* Shortcuts & Hardware Readiness */}
      <div className="admin-dashboard__item-32">
        <div className="admin-dashboard__item-33">
          <h3 className="admin-dashboard__item-34">
            Quick Actions
          </h3>
          <div className="admin-dashboard__item-35">
            <Button
              variant="secondary"
              size="sm"
              className="admin-dashboard__item-36"
              onClick={() => setAdminScreen('PRODUCTS')}
            >
              Add New Product
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="admin-dashboard__item-37"
              onClick={() => setAdminScreen('CART_MONITORING')}
            >
              Cashier Queue
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="admin-dashboard__item-38"
              onClick={() => setAdminScreen('REPORTS')}
            >
              Daily Reports
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="admin-dashboard__item-39"
              onClick={() => setAdminScreen('SETTINGS')}
            >
              Cart Settings
            </Button>
          </div>
        </div>

        <div className="admin-dashboard__item-40">
          <h3 className="admin-dashboard__item-41">
            <Cpu className="admin-dashboard__item-42" />
            <span>Raspberry Pi 3B Hardware Status</span>
          </h3>
          <div className="admin-dashboard__item-43">
            <div className="admin-dashboard__item-44">
              <span className="admin-dashboard__item-45">OJ-MP6300 Barcode Scanner:</span>
              <span className="admin-dashboard__item-46">
                <CheckCircle2 className="admin-dashboard__item-47" />
                <span>Ready (USB Wedge)</span>
              </span>
            </div>
            <div className="admin-dashboard__item-48">
              <span className="admin-dashboard__item-49">HX711 Load-Cell Scale:</span>
              <span className="admin-dashboard__item-50">
                <CheckCircle2 className="admin-dashboard__item-51" />
                <span>Calibrated (±{settings.weightToleranceGrams}g)</span>
              </span>
            </div>
            <div className="admin-dashboard__item-52">
              <span className="admin-dashboard__item-53">Voice Assistance (TTS):</span>
              <span className="admin-dashboard__item-54">
                {settings.voiceEnabled ? 'Active (SpeechSynthesis)' : 'Muted'}
              </span>
            </div>
            <div className="admin-dashboard__item-55">
              <span className="admin-dashboard__item-56">Display Resolution:</span>
              <span className="admin-dashboard__item-57">7-inch (800×480 Touch)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
