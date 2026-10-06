import './AdminReports.css';
import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { BarChart3, TrendingUp, AlertTriangle, PackageCheck } from 'lucide-react';
import { getReportSummary } from '../../services/adminService';

type SalesHour = { hour: number; label: string; sales: number };
type TopProduct = { name: string; quantity: number; revenue: number };
type LowStockProduct = { id: string; name: string; stock: number };
type ReportData = {
  summary: { totalSales: number; transactionCount: number; averageBasket: number };
  topProducts: TopProduct[];
  hourlySales: SalesHour[];
  lowStockProducts: LowStockProduct[];
};

export const AdminReports: React.FC = () => {
  const { settings } = useCart();
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getReportSummary()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load report.'));
  }, []);

  const totalSales = report?.summary?.totalSales || 0;
  const totalTxCount = report?.summary?.transactionCount || 0;
  const topProducts = report?.topProducts || [];
  const lowStockProducts = report?.lowStockProducts || [];
  const hourlyData = report?.hourlySales || [];
  const maxSale = Math.max(...hourlyData.map((d) => d.sales), 1000);

  return (
    <div className="admin-reports">
      {/* Header */}
      <div className="admin-reports__header">
        <h2 className="admin-reports__title">Store Analytics & Reports</h2>
        {error && <p role="alert" className="admin-reports__error">{error}</p>}
      </div>

      {/* Top 2 summary cards */}
      <div className="admin-reports__summary-grid">
        <div className="admin-reports__summary-card admin-reports__summary-card--revenue">
          <div className="admin-reports__card-heading">
            <TrendingUp className="admin-reports__card-icon" />
            <span>Today&apos;s Revenue</span>
          </div>
          <div className="admin-reports__card-value">
            {settings.currencySymbol} {totalSales.toFixed(2)}
          </div>
          <span className="admin-reports__card-note">Gross checkout volume</span>
        </div>

        <div className="admin-reports__summary-card admin-reports__summary-card--transactions">
          <div className="admin-reports__card-heading">
            <BarChart3 className="admin-reports__card-icon" />
            <span>Total Transactions</span>
          </div>
          <div className="admin-reports__card-value">
            {totalTxCount}
          </div>
          <span className="admin-reports__card-note">
            Avg Basket: {settings.currencySymbol} {(report?.summary?.averageBasket || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Sales Velocity Chart */}
      <div className="admin-reports__chart-card">
        <span className="admin-reports__section-title">
          Sales Volume by Time of Day
        </span>
        <div className="admin-reports__chart">
          {hourlyData.map((d, idx) => {
            const heightPercent = Math.round((d.sales / maxSale) * 100);
            return (
              <div key={idx} className="admin-reports__chart-column">
                <span className="admin-reports__chart-value">
                  ₱{d.sales}
                </span>
                <div
                  className="admin-reports__chart-bar"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="admin-reports__chart-label">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Products & Low Stock */}
      <div className="admin-reports__details-grid">
        <div className="admin-reports__details-card">
          <div className="admin-reports__details-heading">
            <PackageCheck className="admin-reports__details-icon" />
            <span>Top Performing Items</span>
          </div>
          <div className="admin-reports__list">
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="admin-reports__list-item"
                >
                  <span className="admin-reports__item-name">
                    {idx + 1}. {p.name}
                  </span>
                  <div className="admin-reports__item-stats">
                    <span className="admin-reports__item-quantity">
                      {p.quantity} sold
                    </span>
                    <span className="admin-reports__item-revenue">
                      {settings.currencySymbol} {p.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="admin-reports__empty-state">No product sales recorded yet.</p>
            )}
          </div>
        </div>

        <div className="admin-reports__details-card">
          <div className="admin-reports__details-heading admin-reports__details-heading--warning">
            <AlertTriangle className="admin-reports__details-icon" />
            <span>Low Stock Alerts</span>
          </div>
          <div className="admin-reports__list">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="admin-reports__list-item"
                >
                  <span className="admin-reports__item-name">{p.name}</span>
                  <span className="admin-reports__item-stock">
                    {p.stock} units left
                  </span>
                </div>
              ))
            ) : (
              <p className="admin-reports__empty-state">All inventory levels are healthy.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
