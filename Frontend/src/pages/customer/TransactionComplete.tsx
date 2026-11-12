import './TransactionComplete.css';
import React from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const TransactionComplete: React.FC = () => {
  const { resetShoppingSession } = useCart();

  return (
    <main className="payment-complete">
      <section className="payment-complete__card" aria-labelledby="payment-complete-title">
        <div className="payment-complete__icon">
          <CheckCircle2 aria-hidden="true" />
        </div>
        <h1 id="payment-complete-title">Payment successful!</h1>
        <p className="payment-complete__message">
          Thank you for shopping. Your receipt is being printed.
        </p>
        <button type="button" className="payment-complete__done" onClick={resetShoppingSession}>
          <Check aria-hidden="true" />
          Done
        </button>
      </section>

    </main>
  );
};
