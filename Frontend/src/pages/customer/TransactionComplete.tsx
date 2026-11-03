import './TransactionComplete.css';
import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const TransactionComplete: React.FC = () => {
  const { resetShoppingSession } = useCart();
  const [secondsUntilReset, setSecondsUntilReset] = useState(20);
  const [showPaymentToast, setShowPaymentToast] = useState(true);

  useEffect(() => {
    const countdownId = window.setInterval(
      () => setSecondsUntilReset((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    const resetId = window.setTimeout(resetShoppingSession, 20000);

    return () => {
      window.clearInterval(countdownId);
      window.clearTimeout(resetId);
    };
  }, [resetShoppingSession]);

  useEffect(() => {
    const toastId = window.setTimeout(() => setShowPaymentToast(false), 4000);
    return () => window.clearTimeout(toastId);
  }, []);

  return (
    <main className="payment-complete">
      {showPaymentToast && (
        <div className="payment-complete__toast" role="status" aria-live="polite" aria-atomic="true">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>Payment successful</strong>
            <span>Your QR Ph payment has been verified.</span>
          </div>
        </div>
      )}

      <section className="payment-complete__card" aria-labelledby="payment-complete-title">
        <div className="payment-complete__icon">
          <CheckCircle2 aria-hidden="true" />
        </div>
        <p className="payment-complete__eyebrow">Payment verified</p>
        <h1 id="payment-complete-title">Payment successful!</h1>
        <p className="payment-complete__message">
          Thank you for shopping. Your receipt is being printed.
        </p>
        <div className="payment-complete__secure">
          <ShieldCheck aria-hidden="true" />
          <span>QR Ph secured</span>
        </div>
        <p className="payment-complete__countdown">
          Returning to the welcome screen in <strong>{secondsUntilReset}s</strong>
        </p>
        <button type="button" className="payment-complete__done" onClick={resetShoppingSession}>
          <Check aria-hidden="true" />
          Done
        </button>
      </section>

    </main>
  );
};
