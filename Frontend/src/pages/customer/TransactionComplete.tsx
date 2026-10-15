import './TransactionComplete.css';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingCart, Sparkles, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';

export const TransactionComplete: React.FC = () => {
  const { cartId, currentTotal, transactions, resetShoppingSession, settings } = useCart();
  const [secondsUntilReset, setSecondsUntilReset] = useState(5);

  useEffect(() => {
    const countdownId = window.setInterval(() => {
      setSecondsUntilReset((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    const resetId = window.setTimeout(resetShoppingSession, 5000);

    return () => {
      window.clearInterval(countdownId);
      window.clearTimeout(resetId);
    };
  }, [resetShoppingSession]);

  const latestTx = transactions.find((transaction) => transaction.cartId === cartId) || null;
  const receiptCartId = latestTx?.cartId || cartId;
  const receiptTotal = latestTx?.total ?? currentTotal;

  return (
    <div className="transaction-complete__item-1">

      <div className="transaction-complete__item-2">
        <span className="transaction-complete__item-3">
          <Sparkles className="transaction-complete__item-4" />
          <span>Payment Verified</span>
        </span>
      </div>


      <div className="transaction-complete__item-5">
        <div className="transaction-complete__item-6">
          <CheckCircle2 className="transaction-complete__item-7" />
        </div>

        <h2 className="transaction-complete__item-8">
          ✓ SHOPPING COMPLETE
        </h2>


        <div className="transaction-complete__item-9">
          <div className="transaction-complete__item-10">
            <span>Cart ID:</span>
            <span className="transaction-complete__item-11">{receiptCartId || 'Not available'}</span>
          </div>

          <div className="transaction-complete__item-12">
            <span>Transaction ID:</span>
            <span className="transaction-complete__item-13">{latestTx?.id || 'Not available'}</span>
          </div>

          <div className="transaction-complete__item-14">
            <span className="transaction-complete__item-15">Total Amount:</span>
            <span className="transaction-complete__item-16">
              {settings.currencySymbol}{receiptTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>


      <div className="transaction-complete__item-17">
        <p className="transaction-complete__next-customer">
          Returning to Start Shopping for the next customer in {secondsUntilReset}s...
        </p>
        <Button
          variant="glow"
          size="lg"
          className="transaction-complete__item-18"
          icon={<Check className="transaction-complete__item-19" />}
          onClick={resetShoppingSession}
        >
          DONE NOW
        </Button>
      </div>
    </div>
  );
};
