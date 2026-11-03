import './AdminCartMonitoring.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, QrCode, RefreshCw, ShieldCheck, Wifi } from 'lucide-react';
import { getPendingQrPhPayments } from '../../services/paymentApi';

export const AdminCartMonitoring: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response: any = await getPendingQrPhPayments();
      setPayments(Array.isArray(response?.payments) ? response.payments : []);
    } catch (requestError) {
      console.error('Could not load QR Ph payment queue', requestError);
      setError('QR Ph payment monitoring is unavailable. Check the backend connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
    const interval = window.setInterval(loadPayments, 5000);
    return () => window.clearInterval(interval);
  }, [loadPayments]);

  const counts = useMemo(() => ({
    pending: payments.filter((payment) => payment.status === 'PENDING').length,
    processing: payments.filter((payment) => payment.status === 'PROCESSING').length,
    attention: payments.filter((payment) => payment.status === 'REVIEW_REQUIRED').length,
  }), [payments]);

  return (
    <main className="payment-monitor">
      <header className="payment-monitor__header">
        <div><h1>Cart Monitoring</h1></div>
        <button type="button" onClick={() => void loadPayments()} disabled={isLoading}><RefreshCw className={isLoading ? 'is-spinning' : ''} /> Refresh</button>
      </header>

      <section className="payment-monitor__summary" aria-label="Payment summary">
        <article><span><Clock3 /></span><div><small>Awaiting payment</small><strong>{counts.pending}</strong></div></article>
        <article><span><ShieldCheck /></span><div><small>Being verified</small><strong>{counts.processing}</strong></div></article>
        <article className={counts.attention ? 'needs-attention' : ''}><span><AlertTriangle /></span><div><small>Needs attention</small><strong>{counts.attention}</strong></div></article>
      </section>

      {error && <div className="payment-monitor__error" role="alert"><AlertTriangle />{error}</div>}

      <section className="payment-monitor__list" aria-label="Pending QR Ph payments">
        {payments.length === 0 && !isLoading ? (
          <div className="payment-monitor__empty"><QrCode /><strong>No pending QR Ph payments</strong><span>New kiosk payments will appear here automatically.</span></div>
        ) : payments.map((payment) => (
          <article className={`payment-monitor__card payment-monitor__card--${String(payment.status).toLowerCase()}`} key={payment.paymentId}>
            <div className="payment-monitor__cart"><span><QrCode /></span><div><small>Smart cart</small><strong>{payment.cartId}</strong></div></div>
            <div className="payment-monitor__detail"><small>Reference</small><strong>{payment.reference}</strong></div>
            <div className="payment-monitor__detail"><small>Amount</small><strong>₱{Number(payment.amount || 0).toFixed(2)}</strong></div>
            <span className="payment-monitor__status"><i /><b>{String(payment.status).replace('_', ' ')}</b></span>
            <span className="payment-monitor__online"><Wifi /> Online</span>
          </article>
        ))}
      </section>
    </main>
  );
};
