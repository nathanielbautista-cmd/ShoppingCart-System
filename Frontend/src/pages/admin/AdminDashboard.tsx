import './AdminDashboard.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleX,
  Clock3,
  Package,
  PhilippinePeso,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getDashboardOverview } from '../../services/adminService';
import { AdminScreen } from '../../types';

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
type SalesPeriod = 'weekly' | 'monthly';

interface DashboardData {
  generatedAt: string;
  salesPeriod: SalesPeriod;
  summary: {
    totalProducts: number;
    todaySales: number;
    totalSales: number;
    lowStock: number;
    outOfStock: number;
    waitingForCashier: number;
  };
  stockStatus: { inStock: number; lowStock: number; outOfStock: number };
  salesOverview: Array<{ date: string; sales: number; transactions: number }>;
  topProducts: Array<{ productId: string; name: string; unitsSold: number; totalSales: number }>;
  slowMovingProducts: Array<{ productId: string; name: string; unitsSold: number; totalSales: number }>;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    stock: number;
    minimumStock: number;
    status: StockStatus;
  }>;
}

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

const formatDay = (date: string) => new Date(`${date}T00:00:00+08:00`).toLocaleDateString('en-PH', {
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Manila',
});

const formatDateTime = (date: string) => new Date(date).toLocaleString('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
});

export const AdminDashboard: React.FC = () => {
  const { setAdminScreen } = useCart();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('weekly');
  const activeRequest = useRef(0);
  const mounted = useRef(true);

  const loadDashboard = useCallback(async (silent = false) => {
    const requestId = ++activeRequest.current;
    if (!silent) setRefreshing(true);

    try {
      const response = await getDashboardOverview(salesPeriod) as DashboardData & { success: boolean };
      if (mounted.current && requestId === activeRequest.current) {
        setDashboard(response);
        setError(null);
      }
    } catch (requestError) {
      if (mounted.current && requestId === activeRequest.current) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard data.');
      }
    } finally {
      if (mounted.current && requestId === activeRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [salesPeriod]);

  useEffect(() => {
    mounted.current = true;
    void loadDashboard(true);
    const poller = window.setInterval(() => void loadDashboard(true), 30_000);
    return () => {
      mounted.current = false;
      activeRequest.current += 1;
      window.clearInterval(poller);
    };
  }, [loadDashboard]);

  const stockTotal = dashboard
    ? dashboard.stockStatus.inStock + dashboard.stockStatus.lowStock + dashboard.stockStatus.outOfStock
    : 0;
  const inStockPercent = stockTotal ? (dashboard!.stockStatus.inStock / stockTotal) * 100 : 0;
  const lowStockPercent = stockTotal ? (dashboard!.stockStatus.lowStock / stockTotal) * 100 : 0;
  const donutBackground = stockTotal
    ? `conic-gradient(#16a34a 0 ${inStockPercent}%, #f59e0b ${inStockPercent}% ${inStockPercent + lowStockPercent}%, #ef4444 ${inStockPercent + lowStockPercent}% 100%)`
    : '#e2e8f0';

  const maxDailySales = useMemo(
    () => Math.max(...(dashboard?.salesOverview.map((day) => day.sales) || [0]), 1),
    [dashboard]
  );
  const maxUnitsSold = useMemo(
    () => Math.max(...(dashboard?.topProducts.map((product) => product.unitsSold) || [0]), 1),
    [dashboard]
  );
  const maxSlowUnitsSold = useMemo(
    () => Math.max(...(dashboard?.slowMovingProducts.map((product) => product.unitsSold) || [0]), 1),
    [dashboard]
  );

  if (loading) {
    return (
      <main className="admin-dashboard" aria-busy="true" aria-label="Loading dashboard">
        <div className="dashboard-loading__header dashboard-skeleton" />
        <div className="dashboard-loading__cards">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="dashboard-loading__card dashboard-skeleton" />)}
        </div>
        <div className="dashboard-loading__panels">
          <div className="dashboard-loading__panel dashboard-skeleton" />
          <div className="dashboard-loading__panel dashboard-skeleton" />
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="admin-dashboard admin-dashboard--centered">
        <div className="dashboard-error" role="alert">
          <div className="dashboard-error__icon"><AlertTriangle /></div>
          <h2>Dashboard data is unavailable</h2>
          <p>{error || 'The server did not return dashboard information.'}</p>
          <button type="button" onClick={() => void loadDashboard()} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'is-spinning' : ''} /> Try again
          </button>
        </div>
      </main>
    );
  }

  const summaryCards: Array<{
    label: string;
    value: string;
    icon: React.ReactNode;
    tone: string;
    destination: AdminScreen;
  }> = [
    { label: 'Total Products', value: dashboard.summary.totalProducts.toLocaleString(), icon: <Package />, tone: 'green', destination: 'PRODUCTS' },
    { label: "Today's Sales", value: peso.format(dashboard.summary.todaySales), icon: <PhilippinePeso />, tone: 'emerald', destination: 'TRANSACTIONS' },
    { label: 'Total Sales', value: peso.format(dashboard.summary.totalSales), icon: <PhilippinePeso />, tone: 'blue', destination: 'TRANSACTIONS' },
    { label: 'Low Stock', value: dashboard.summary.lowStock.toLocaleString(), icon: <AlertTriangle />, tone: 'amber', destination: 'INVENTORY' },
    { label: 'Out of Stock', value: dashboard.summary.outOfStock.toLocaleString(), icon: <CircleX />, tone: 'red', destination: 'INVENTORY' },
    { label: 'Waiting for Cashier', value: dashboard.summary.waitingForCashier.toLocaleString(), icon: <Clock3 />, tone: 'violet', destination: 'CART_MONITORING' },
  ];

  return (
    <main className="admin-dashboard">
      <header className="dashboard-heading">
        <div>
          <h1>Admin Dashboard</h1>
        </div>
        <div className="dashboard-heading__actions">
          <span className="dashboard-last-updated">
            <span className="dashboard-live-dot" /> Updated {formatDateTime(dashboard.generatedAt)}
          </span>
          <button type="button" className="dashboard-refresh" onClick={() => void loadDashboard()} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'is-spinning' : ''} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard-stale-warning" role="status">
          <AlertTriangle /> Showing the last available data. Automatic refresh failed: {error}
        </div>
      )}

      <section className="dashboard-summary" aria-label="Grocery summary">
        {summaryCards.map((card) => (
          <button
            type="button"
            key={card.label}
            className={`dashboard-metric dashboard-metric--${card.tone}`}
            onClick={() => setAdminScreen(card.destination)}
            aria-label={`${card.label}: ${card.value}. Open ${card.destination.toLowerCase().replace('_', ' ')}.`}
          >
            <span className="dashboard-metric__icon">{card.icon}</span>
              <span className="dashboard-metric__content">
                <span className="dashboard-metric__label">{card.label}</span>
                <strong>{card.value}</strong>
              </span>
          </button>
        ))}
      </section>

      <div className="dashboard-grid dashboard-grid--overview">
        <section className="dashboard-panel dashboard-stock">
          <div className="dashboard-panel__heading">
            <div>
              <span className="dashboard-panel__icon"><Boxes /></span>
              <div><h2>Grocery Stock Status</h2></div>
            </div>
            <button type="button" onClick={() => setAdminScreen('INVENTORY')}>View inventory <ArrowRight /></button>
          </div>
          {stockTotal === 0 ? (
            <div className="dashboard-empty"><Boxes /><strong>No products yet</strong><span>Stock status will appear after products are added.</span></div>
          ) : (
            <div className="dashboard-stock__content">
              <div className="dashboard-donut" style={{ background: donutBackground }} role="img" aria-label={`${dashboard.stockStatus.inStock} in stock, ${dashboard.stockStatus.lowStock} low stock, ${dashboard.stockStatus.outOfStock} out of stock`}>
                <div className="dashboard-donut__center"><strong>{stockTotal}</strong><span>Products</span></div>
              </div>
              <div className="dashboard-stock__legend">
                <div><span className="stock-dot stock-dot--green" /><span><strong>In Stock</strong><small>Above minimum level</small></span><b>{dashboard.stockStatus.inStock}</b></div>
                <div><span className="stock-dot stock-dot--amber" /><span><strong>Low Stock</strong><small>At or below minimum</small></span><b>{dashboard.stockStatus.lowStock}</b></div>
                <div><span className="stock-dot stock-dot--red" /><span><strong>Out of Stock</strong><small>Zero units available</small></span><b>{dashboard.stockStatus.outOfStock}</b></div>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-panel dashboard-sales">
          <div className="dashboard-panel__heading">
            <div>
              <span className="dashboard-panel__icon"><Activity /></span>
              <div><h2>Sales Overview</h2></div>
            </div>
            <label className="dashboard-period-select">
              <span>Sales period</span>
              <select
                value={salesPeriod}
                onChange={(event) => {
                  setRefreshing(true);
                  setSalesPeriod(event.target.value as SalesPeriod);
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
          <div className="dashboard-chart" aria-label="Seven-day sales bar chart">
            <div className="dashboard-chart__grid"><span /><span /><span /><span /></div>
            <div className={`dashboard-chart__bars ${salesPeriod === 'monthly' ? 'dashboard-chart__bars--monthly' : ''}`}>
              {dashboard.salesOverview.map((day, index) => {
                const height = day.sales > 0 ? Math.max((day.sales / maxDailySales) * 100, 5) : 2;
                const showMonthlyLabel = index === 0 || index === dashboard.salesOverview.length - 1 || index % 5 === 0;
                return (
                  <div className="dashboard-chart__day" key={day.date}>
                    <button
                      type="button"
                      className="dashboard-chart__bar-wrap"
                      data-tooltip={`${peso.format(day.sales)} • ${day.transactions} ${day.transactions === 1 ? 'sale' : 'sales'}`}
                      aria-label={`${formatDay(day.date)}: ${peso.format(day.sales)}, ${day.transactions} completed transactions`}
                    >
                      <span className="dashboard-chart__bar" style={{ height: `${height}%` }} />
                    </button>
                    <span>{salesPeriod === 'weekly' || showMonthlyLabel ? formatDay(day.date) : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--details">
        <section className="dashboard-panel dashboard-product-chart">
          <div className="dashboard-panel__heading">
            <div>
              <span className="dashboard-panel__icon"><TrendingUp /></span>
              <div><h2>Fast-Moving Products</h2></div>
            </div>
          </div>
          {dashboard.topProducts.length === 0 ? (
            <div className="dashboard-empty dashboard-empty--compact"><TrendingUp /><strong>No completed sales yet</strong><span>Fast-moving products will appear after checkout.</span></div>
          ) : (
            <ol className="dashboard-product-bars" aria-label="Fast-moving products by units sold">
              {dashboard.topProducts.map((product) => (
                <li key={`${product.productId}-${product.name}`}>
                  <div className="dashboard-product-bars__label">
                    <strong>{product.name}</strong>
                    <span>{product.unitsSold.toLocaleString()} sold</span>
                  </div>
                  <div
                    className="dashboard-product-bars__track"
                    role="img"
                    aria-label={`${product.name}: ${product.unitsSold} units sold, ${peso.format(product.totalSales)} revenue`}
                  >
                    <span style={{ width: `${Math.max((product.unitsSold / maxUnitsSold) * 100, 5)}%` }} />
                  </div>
                  <span className="dashboard-product-bars__revenue">{peso.format(product.totalSales)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="dashboard-panel dashboard-product-chart dashboard-product-chart--slow">
          <div className="dashboard-panel__heading">
            <div>
              <span className="dashboard-panel__icon dashboard-panel__icon--amber"><TrendingDown /></span>
              <div><h2>Slow-Moving Products</h2></div>
            </div>
          </div>
          {dashboard.slowMovingProducts.length === 0 ? (
            <div className="dashboard-empty dashboard-empty--compact"><TrendingDown /><strong>No products to analyze</strong><span>Slow-moving products will appear after products are added.</span></div>
          ) : (
            <ol className="dashboard-product-bars" aria-label="Slow-moving products by units sold">
              {dashboard.slowMovingProducts.map((product) => (
                <li key={`${product.productId}-${product.name}`}>
                  <div className="dashboard-product-bars__label">
                    <strong>{product.name}</strong>
                    <span>{product.unitsSold.toLocaleString()} sold</span>
                  </div>
                  <div
                    className="dashboard-product-bars__track"
                    role="img"
                    aria-label={`${product.name}: ${product.unitsSold} units sold, ${peso.format(product.totalSales)} revenue`}
                  >
                    <span style={{ width: product.unitsSold > 0 ? `${Math.max((product.unitsSold / maxSlowUnitsSold) * 100, 5)}%` : '0%' }} />
                  </div>
                  <span className="dashboard-product-bars__revenue">{peso.format(product.totalSales)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
};
