import './CheckoutReview.css';
import React from 'react';
import { ArrowLeft, Check, ReceiptText } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';

export const CheckoutReview: React.FC = () => {
  const {
    cartItems,
    currentTotal,
    budget,
    remainingBudget,
    confirmCheckout,
    setCustomerScreen,
    settings,
  } = useCart();

  const formattedCurrency = (val: number) => {
    return `${settings.currencySymbol}${Math.abs(val).toFixed(2)}`;
  };

  return (
    <div className="checkout-review__item-1">

      <div className="checkout-review__item-2">
        <h2 className="checkout-review__item-3">
          <ReceiptText className="checkout-review__item-4" />
          <span>CHECKOUT REVIEW</span>
        </h2>
      </div>


      <div className="checkout-review__item-5">
        <div className="checkout-review__item-6">
          <span>Item & Qty</span>
          <span>Amount</span>
        </div>

        {cartItems.map((item) => {
          const itemTotal = item.product.price * item.quantity;
          return (
            <div key={item.product.id} className="checkout-review__item-7">
              <span className="checkout-review__item-8">
                {item.product.name} <span className="checkout-review__item-9">× {item.quantity}</span>
              </span>
              <span className="checkout-review__item-10">
                {formattedCurrency(itemTotal)}
              </span>
            </div>
          );
        })}

        <div className="checkout-review__item-11">
          <div className="checkout-review__item-12">
            <span>TOTAL</span>
            <span className="checkout-review__item-13">
              {formattedCurrency(currentTotal)}
            </span>
          </div>

          <div className="checkout-review__item-14">
            <span>Budget Allocation</span>
            <span className="checkout-review__item-15">
              {formattedCurrency(budget)}
            </span>
          </div>

          <div className="checkout-review__item-16">
            <span>Remaining Budget</span>
            <span
              className={`font-mono tabular-nums font-bold ${
                remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-300'
              }`}
            >
              {remainingBudget < 0 ? `-${formattedCurrency(Math.abs(remainingBudget))}` : formattedCurrency(remainingBudget)}
            </span>
          </div>
        </div>
      </div>


      <div className="checkout-review__item-17">
        <Button
          variant="secondary"
          size="md"
          icon={<ArrowLeft className="checkout-review__item-18" />}
          onClick={() => setCustomerScreen('CART')}
        >
          BACK TO CART
        </Button>

        <Button
          variant="glow"
          size="md"
          icon={<Check className="checkout-review__item-19" />}
          onClick={confirmCheckout}
        >
          CONFIRM CHECKOUT
        </Button>
      </div>
    </div>
  );
};
