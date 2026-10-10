import './Cart.css';
import React, { useEffect } from 'react';
import { ShoppingBag, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { CartItemRow } from '../../components/CartItem';
import { Button } from '../../components/Button';

export const Cart: React.FC = () => {
  const {
    cartItems,
    currentTotal,
    budget,
    remainingBudget,
    setCustomerScreen,
    settings,
  } = useCart();

  const formattedCurrency = (val: number) => {
    return `${settings.currencySymbol}${Math.abs(val).toFixed(2)}`;
  };

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCustomerScreen('SHOPPING_HOME');
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [setCustomerScreen]);

  return (
    <div
      id="customer-cart-sidebar"
      className="cart__item-1 cart__item-1--drawer"
      role="dialog"
      aria-modal="false"
      aria-labelledby="customer-cart-title"
    >

      <div className="cart__item-2">
        <div className="cart__item-3">
          <div className="cart__item-4">
            <ShoppingBag className="cart__item-5" />
          </div>
          <div>
            <h2 id="customer-cart-title" className="cart__item-6">MY CART</h2>
            <span className="cart__item-7">
              {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} ({cartItems.length} distinct) in basket
            </span>
          </div>
        </div>
        <button
          type="button"
          className="cart__close"
          onClick={() => setCustomerScreen('SHOPPING_HOME')}
          aria-label="Close cart"
          title="Close cart"
        >
          <X />
        </button>
      </div>


      <div className="cart__item-8">
        {cartItems.length === 0 ? (
          <div className="cart__item-9">
            <div className="cart__item-10">
              <ShoppingBag className="cart__item-11" />
            </div>
            <h3 className="cart__item-12">Your cart is empty</h3>
          </div>
        ) : (
          cartItems.map((item) => <CartItemRow key={item.product.id} item={item} />)
        )}
      </div>


      <div className="cart__item-13">

        <div className="cart__item-14">
          <div>
            <span className="cart__item-15">
              Subtotal
            </span>
            <span className="cart__item-16">
              {formattedCurrency(currentTotal)}
            </span>
          </div>

          <div>
            <span className="cart__item-17">
              Budget
            </span>
            <span className="cart__item-18">
              {formattedCurrency(budget)}
            </span>
          </div>

          <div>
            <span className="cart__item-19">
              Remaining
            </span>
            <span
              className={`text-base sm:text-lg font-black tabular-nums ${
                remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-300'
              }`}
            >
              {remainingBudget < 0 ? `-${formattedCurrency(Math.abs(remainingBudget))}` : formattedCurrency(remainingBudget)}
            </span>
          </div>
        </div>


        <div className="cart__item-20">
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft className="cart__item-21" />}
            onClick={() => setCustomerScreen('SHOPPING_HOME')}
          >
            CONTINUE SHOPPING
          </Button>

          <Button
            variant="glow"
            size="md"
            disabled={cartItems.length === 0}
            icon={<ArrowRight className="cart__item-22" />}
            onClick={() => setCustomerScreen('CHECKOUT_REVIEW')}
          >
            CHECKOUT
          </Button>
        </div>
      </div>
    </div>
  );
};
