import './AdminReports.css';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  PackageCheck,
  PackageX,
  RefreshCw,
  Search,
  TrendingDown,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getProductPerformance, ProductPerformanceParams } from '../../services/adminService';

type Classification = 'FAST_MOVING' | 'SLOW_MOVING' | 'NO_SALES' | 'MODERATE' | 'INSUFFICIENT_HISTORY';
type ClassificationFilter = 'ALL' | Classification;
type SortKey = 'name' | 'barcode' | 'category' | 'unitsSold' | 'salesRevenue' | 'currentStock' | 'classification';
type SortDirection = 'asc' | 'desc';

interface ProductPerformance {
  productId: string;
  name: string;
  barcode: string;
  category: string;
  unitsSold: number;
  salesRevenue: number;
  currentStock: number;
  minimumStock: number;
  salesVelocity: number;
  historyDays: number;
  classification: Classification;
}

interface ProductPerformanceReport {
  generatedAt: string;
  period: { from: string; to: string; days: number };
  thresholds: { fastUnitsPerDay: number; slowUnitsPerDay: number; minimumHistoryDays: number };
  summary: {
    fastMoving: number;
    slowMoving: number;
    noSales: number;
    moderate: number;
    insufficientHistory: number;
    totalProducts: number;
  };
  products: ProductPerformance[];
}

const PAGE_SIZE = 10;
const CLASSIFICATION_LABELS: Record<Classification, string> = {
  FAST_MOVING: 'Fast-moving',
  SLOW_MOVING: 'Slow-moving',
  NO_SALES: 'No sales',
  MODERATE: 'Moderate',
  INSUFFICIENT_HISTORY: 'Insufficient history',
};

const getManilaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const rangeForDays = (days: number) => ({
  from: getManilaDateKey(new Date(Date.now() - (days - 1) * 86_400_000)),
  to: getManilaDateKey(),
});

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const exportCsv = (products: ProductPerformance[], period: ProductPerformanceReport['period']) => {
  const rows = [
    ['Product name', 'SKU / Barcode', 'Category', 'Units sold', 'Sales revenue', 'Current stock', 'Sales velocity', 'History days', 'Movement classification'],
    ...products.map((product) => [
      product.name,
      product.barcode,
      product.category,
      product.unitsSold,
      product.salesRevenue.toFixed(2),
      product.currentStock,
      product.salesVelocity.toFixed(2),
      product.historyDays,
      CLASSIFICATION_LABELS[product.classification],
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `product-performance-${period.from}-to-${period.to}.csv`);
};

const pdfText = (value: unknown) => String(value)
  .normalize('NFKD')
  .replace(/[^\x20-\x7E]/g, '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const fixedColumn = (value: unknown, width: number) => {
  const text = String(value);
  return text.length > width ? `${text.slice(0, Math.max(0, width - 1))}~` : text.padEnd(width, ' ');
};

const exportPdf = (products: ProductPerformance[], report: ProductPerformanceReport) => {
  const pageRows = 34;
  const pages = Array.from({ length: Math.max(1, Math.ceil(products.length / pageRows)) }, (_, index) =>
    products.slice(index * pageRows, (index + 1) * pageRows));
  const objects: string[] = [];
  const fontId = 3;
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  pages.forEach((rows, pageIndex) => {
    const pageId = pageIds[pageIndex];
    const contentId = pageId + 1;
    const header = [
      fixedColumn('Product', 25), fixedColumn('SKU / Barcode', 16), fixedColumn('Category', 15),
      fixedColumn('Units', 7), fixedColumn('Revenue PHP', 13), fixedColumn('Stock', 7), fixedColumn('Classification', 21),
    ].join(' ');
    const lines = rows.map((product) => [
      fixedColumn(product.name, 25), fixedColumn(product.barcode, 16), fixedColumn(product.category, 15),
      fixedColumn(product.unitsSold, 7), fixedColumn(product.salesRevenue.toFixed(2), 13), fixedColumn(product.currentStock, 7),
      fixedColumn(CLASSIFICATION_LABELS[product.classification], 21),
    ].join(' '));
    const commands = [
      'BT', '/F1 14 Tf', `1 0 0 1 36 576 Tm (${pdfText('Product Performance Report')}) Tj`,
      '/F1 8 Tf', `1 0 0 1 36 558 Tm (${pdfText(`${report.period.from} to ${report.period.to} | ${report.period.days} days`)}) Tj`,
      `1 0 0 1 36 544 Tm (${pdfText(`Fast >= ${report.thresholds.fastUnitsPerDay}/day | Slow <= ${report.thresholds.slowUnitsPerDay}/day | Minimum history ${report.thresholds.minimumHistoryDays} days`)}) Tj`,
      '/F1 7 Tf', `1 0 0 1 36 522 Tm (${pdfText(header)}) Tj`,
      ...lines.map((line, index) => `1 0 0 1 36 ${507 - index * 13} Tm (${pdfText(line)}) Tj`),
      `1 0 0 1 36 30 Tm (${pdfText(`Page ${pageIndex + 1} of ${pages.length} | ${products.length} products`)}) Tj`, 'ET',
    ];
    const stream = commands.join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `product-performance-${report.period.from}-to-${report.period.to}.pdf`);
};

export const AdminReports: React.FC = () => {
  const { settings, adjustInventory } = useCart();
  const initialRange = useMemo(() => rangeForDays(30), []);
  const [filters, setFilters] = useState<ProductPerformanceParams>(initialRange);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [activePreset, setActivePreset] = useState<'7' | '30' | '90' | 'custom'>('30');
  const [report, setReport] = useState<ProductPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState<ClassificationFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('unitsSold');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getProductPerformance(filters)
      .then((data) => { if (active) setReport(data as ProductPerformanceReport); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load product performance.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, refreshKey]);

  const applyPreset = (days: 7 | 30 | 90) => {
    const range = rangeForDays(days);
    const next = { ...draftFilters, ...range };
    setDraftFilters(next);
    setFilters(next);
    setActivePreset(String(days) as '7' | '30' | '90');
  };

  const applyFilters = () => {
    setNotice('');
    if (draftFilters.from > draftFilters.to) {
      setError('The start date cannot be after the end date.');
      return;
    }
    setFilters(draftFilters);
    setActivePreset('custom');
  };

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (report?.products || []).filter((product) => {
      const matchesSearch = !query || [product.name, product.barcode, product.category]
        .some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (classification === 'ALL' || product.classification === classification);
    });
    return [...filtered].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const comparison = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [classification, report, search, sortDirection, sortKey]);

  useEffect(() => { setPage(1); }, [classification, search, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginatedProducts = visibleProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const chartProducts = useMemo(() => [...(report?.products || [])]
    .sort((a, b) => b.unitsSold - a.unitsSold || a.name.localeCompare(b.name))
    .slice(0, 10), [report]);
  const maxChartValue = Math.max(1, ...chartProducts.map((product) => product.unitsSold));

  const selectSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDirection(key === 'name' || key === 'category' || key === 'barcode' ? 'asc' : 'desc');
    }
  };

  const sortIcon = (key: SortKey) => sortKey === key
    ? sortDirection === 'asc' ? <ArrowUp /> : <ArrowDown />
    : null;

  const quickRestock = async (product: ProductPerformance) => {
    setRestockingId(product.productId);
    setNotice('');
    try {
      await adjustInventory(product.productId, 10);
      setNotice(`${product.name} stock increased by 10.`);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update inventory.');
    } finally {
      setRestockingId(null);
    }
  };

  const money = (value: number) => `${settings.currencySymbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="admin-reports">
      <header className="admin-reports__header">
        <div>
        
          <h2 className="admin-reports__title">Product Performance</h2>
      
        </div>
        <div className="admin-reports__header-actions">
          <button type="button" className="admin-reports__button" disabled={!report || visibleProducts.length === 0} onClick={() => report && exportCsv(visibleProducts, report.period)}><Download /> CSV</button>
          <button type="button" className="admin-reports__button" disabled={!report || visibleProducts.length === 0} onClick={() => report && exportPdf(visibleProducts, report)}><FileText /> PDF</button>
        </div>
      </header>

      <section className="admin-reports__filter-panel" aria-label="Report settings">
        <div className="admin-reports__presets">
          {([7, 30, 90] as const).map((days) => (
            <button type="button" key={days} className={activePreset === String(days) ? 'is-active' : ''} onClick={() => applyPreset(days)}>Last {days} days</button>
          ))}
        </div>
        <div className="admin-reports__filter-fields">
          <label>From<input type="date" value={draftFilters.from} max={draftFilters.to} onChange={(event) => { setDraftFilters({ ...draftFilters, from: event.target.value }); setActivePreset('custom'); }} /></label>
          <label>To<input type="date" value={draftFilters.to} min={draftFilters.from} max={getManilaDateKey()} onChange={(event) => { setDraftFilters({ ...draftFilters, to: event.target.value }); setActivePreset('custom'); }} /></label>
          <button type="button" className="admin-reports__apply" onClick={applyFilters}>Apply</button>
        </div>
      </section>

      {error && <div role="alert" className="admin-reports__message admin-reports__message--error"><span>{error}</span><button type="button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw /> Retry</button></div>}
      {notice && <div role="status" className="admin-reports__message admin-reports__message--success">{notice}</div>}

      <section className="admin-reports__summary-grid" aria-label="Movement summary">
        <article className="admin-reports__summary-card admin-reports__summary-card--fast"><PackageCheck /><div><span>Fast-moving</span><strong>{report?.summary.fastMoving ?? '—'}</strong><small>At least {report?.thresholds.fastUnitsPerDay ?? 1} units/day</small></div></article>
        <article className="admin-reports__summary-card admin-reports__summary-card--slow"><TrendingDown /><div><span>Slow-moving</span><strong>{report?.summary.slowMoving ?? '—'}</strong><small>Up to {report?.thresholds.slowUnitsPerDay ?? 0.25} units/day</small></div></article>
        <article className="admin-reports__summary-card admin-reports__summary-card--none"><PackageX /><div><span>No-sales</span><strong>{report?.summary.noSales ?? '—'}</strong><small>Zero units in this period</small></div></article>
        <article className="admin-reports__summary-card admin-reports__summary-card--history"><BarChart3 /><div><span>Insufficient history</span><strong>{report?.summary.insufficientHistory ?? '—'}</strong><small>Less than {report?.thresholds.minimumHistoryDays ?? 14} observable days</small></div></article>
      </section>

      <section className="admin-reports__chart-card">
        <div className="admin-reports__section-heading"><div><h3>Product sales quantity</h3><p>Top 10 products by units sold</p></div><span>{report ? `${report.period.from} – ${report.period.to}` : ''}</span></div>
        {loading ? <div className="admin-reports__loading">Loading product sales…</div> : chartProducts.length ? (
          <div className="admin-reports__chart" role="img" aria-label="Bar chart of product units sold">
            {chartProducts.map((product) => (
              <div className="admin-reports__bar-row" key={product.productId}>
                <span title={product.name}>{product.name}</span>
                <div><i style={{ width: `${Math.max(product.unitsSold ? 3 : 0, product.unitsSold / maxChartValue * 100)}%` }} className={`is-${product.classification.toLowerCase().replaceAll('_', '-')}`} /></div>
                <strong>{product.unitsSold}</strong>
              </div>
            ))}
          </div>
        ) : <div className="admin-reports__empty">No active products found.</div>}
      </section>

      <section className="admin-reports__table-card">
        <div className="admin-reports__table-tools">
          <div className="admin-reports__search"><Search /><input aria-label="Search products" placeholder="Search product, SKU, or category" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <select aria-label="Filter by movement classification" value={classification} onChange={(event) => setClassification(event.target.value as ClassificationFilter)}>
            <option value="ALL">All classifications</option>
            {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <span>{visibleProducts.length} product{visibleProducts.length === 1 ? '' : 's'}</span>
        </div>
        <div className="admin-reports__table-wrap">
          <table>
            <thead><tr>
              <th><button type="button" onClick={() => selectSort('name')}>Product {sortIcon('name')}</button></th>
              <th><button type="button" onClick={() => selectSort('barcode')}>SKU / Barcode {sortIcon('barcode')}</button></th>
              <th><button type="button" onClick={() => selectSort('category')}>Category {sortIcon('category')}</button></th>
              <th><button type="button" onClick={() => selectSort('unitsSold')}>Units sold {sortIcon('unitsSold')}</button></th>
              <th><button type="button" onClick={() => selectSort('salesRevenue')}>Sales revenue {sortIcon('salesRevenue')}</button></th>
              <th><button type="button" onClick={() => selectSort('currentStock')}>Current stock {sortIcon('currentStock')}</button></th>
              <th><button type="button" onClick={() => selectSort('classification')}>Movement {sortIcon('classification')}</button></th>
              <th>Inventory</th>
            </tr></thead>
            <tbody>
              {!loading && paginatedProducts.map((product) => {
                const needsRestock = product.currentStock <= product.minimumStock;
                return <tr key={product.productId}>
                  <td><strong>{product.name}</strong><small>{product.salesVelocity.toFixed(2)} units/day · {product.historyDays} history days</small></td>
                  <td>{product.barcode}</td><td>{product.category}</td><td>{product.unitsSold.toLocaleString()}</td><td>{money(product.salesRevenue)}</td>
                  <td><span className={needsRestock ? 'admin-reports__stock is-low' : 'admin-reports__stock'}>{product.currentStock}</span><small>Min. {product.minimumStock}</small></td>
                  <td><span className={`admin-reports__badge is-${product.classification.toLowerCase().replaceAll('_', '-')}`}>{CLASSIFICATION_LABELS[product.classification]}</span></td>
                  <td>{needsRestock ? <button type="button" className="admin-reports__restock" disabled={restockingId === product.productId} onClick={() => quickRestock(product)}>{restockingId === product.productId ? 'Updating…' : '+10 Restock'}</button> : <span className="admin-reports__stock-ok">Stock OK</span>}</td>
                </tr>;
              })}
              {!loading && paginatedProducts.length === 0 && <tr><td colSpan={8} className="admin-reports__empty">No products match these filters.</td></tr>}
              {loading && <tr><td colSpan={8} className="admin-reports__loading">Loading product performance…</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="admin-reports__pagination">
          <span>Showing {visibleProducts.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, visibleProducts.length)} of {visibleProducts.length}</span>
          <div><button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><span>Page {currentPage} of {pageCount}</span><button type="button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div>
        </footer>
      </section>
    </div>
  );
};
