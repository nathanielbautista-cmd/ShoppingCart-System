import './WaitingForCashier.css';
import React from 'react';
import { Store, Clock, ShieldCheck, Barcode } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const WaitingForCashier: React.FC = () => {
  const { cartId, currentTotal, settings, setUserMode, setAdminScreen } = useCart();

  return (
    <div className="waiting-for-cashier__item-1">

      <div className="waiting-for-cashier__item-2">
        <span className="waiting-for-cashier__item-3">
          <Clock className="waiting-for-cashier__item-4" />
          <span>Status: WAITING FOR CASHIER</span>
        </span>
      </div>


      <div className="waiting-for-cashier__item-5">
        <div className="waiting-for-cashier__item-6">
          <div className="waiting-for-cashier__item-7">
            <Store className="waiting-for-cashier__item-8" />
          </div>

          <div className="waiting-for-cashier__item-9">
            CHECKOUT READY
          </div>

          <div className="waiting-for-cashier__item-10">
            <div className="waiting-for-cashier__item-11">
              CART IDENTIFIER
            </div>
            <div className="waiting-for-cashier__item-12">
              {cartId}
            </div>


            <div className="waiting-for-cashier__item-13">
              <Barcode className="waiting-for-cashier__item-14" />
              <span>||| | | |||| | ||</span>
            </div>
          </div>

          <p className="waiting-for-cashier__item-15">
            Please proceed to any cashier counter.
          </p>

          <p className="waiting-for-cashier__item-16">
            Cashier will pull your cart details directly from their POS terminal.
            Total: <strong className="waiting-for-cashier__item-17">{settings.currencySymbol}{currentTotal.toFixed(2)}</strong>
          </p>
        </div>
      </div>

      <div className="waiting-for-cashier__item-18">
        <button
          onClick={() => {
            setUserMode('ADMIN');
            setAdminScreen('CART_MONITORING');
          }}
          className="waiting-for-cashier__item-19"
        >
          <ShieldCheck className="waiting-for-cashier__item-20" />
          <span>Open cashier desk (demo)</span>
        </button>
      </div>
    </div>
  );
};
