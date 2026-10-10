import './TransactionComplete.css';
import React from 'react';
import { CheckCircle2, ShoppingCart, Sparkles, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';

export const TransactionComplete: React.FC = () => {
  const { cartId, currentTotal, transactions, resetShoppingSession, settings } = useCart();

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
        <Button
          variant="glow"
          size="lg"
          className="transaction-complete__item-18"
          icon={<Check className="transaction-complete__item-19" />}
          onClick={resetShoppingSession}
        >
          DONE
        </Button>
      </div>
    </div>
  );
};
