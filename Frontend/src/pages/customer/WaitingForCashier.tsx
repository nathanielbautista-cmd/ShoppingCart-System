import './WaitingForCashier.css';
import React from 'react';
import { AlertTriangle, Store, Clock, Barcode, Loader2, RefreshCw, TicketCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const WaitingForCashier: React.FC = () => {
  const {
    cartId,
    cartItems,
    currentTotal,
    settings,
    checkoutSubmitting,
    checkoutError,
    confirmCheckout,
  } = useCart();
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="waiting-for-cashier__item-1">

      <div className="waiting-for-cashier__item-2">
        <span className="waiting-for-cashier__item-3">
          {checkoutSubmitting
            ? <Loader2 className="waiting-for-cashier__item-4" />
            : checkoutError
              ? <AlertTriangle className="waiting-for-cashier__status-icon" />
              : <Clock className="waiting-for-cashier__item-4" />}
          <span>
            {checkoutSubmitting
              ? 'Sending cart to cashier'
              : checkoutError
                ? 'Checkout needs attention'
                : 'Checkout confirmed — waiting for payment'}
          </span>
        </span>
      </div>


      <div className="waiting-for-cashier__item-5">
        <div className="waiting-for-cashier__item-6">
          <div className="waiting-for-cashier__item-7">
            <Store className="waiting-for-cashier__item-8" />
          </div>

          <div className="waiting-for-cashier__item-9">
            PLEASE PROCEED TO AN AVAILABLE CASHIER
          </div>

          <div className="waiting-for-cashier__item-10">
            <div className="waiting-for-cashier__ticket-heading">
              <TicketCheck aria-hidden="true" />
              <span>iCART CASHIER TICKET</span>
            </div>
            <div className="waiting-for-cashier__item-11">
              CART IDENTIFIER
            </div>
            <div className="waiting-for-cashier__item-12">
              {cartId}
            </div>

            <div className="waiting-for-cashier__ticket-divider" />

            <div className="waiting-for-cashier__ticket-summary">
              <div>
                <span>Items</span>
                <strong>{totalItems}</strong>
              </div>
              <div>
                <span>Total Due</span>
                <strong>{settings.currencySymbol}{currentTotal.toFixed(2)}</strong>
              </div>
            </div>

            <div className="waiting-for-cashier__item-13">
              <Barcode className="waiting-for-cashier__item-14" />
              <span>||| | | |||| | || | |||</span>
            </div>
            <small className="waiting-for-cashier__ticket-note">Present this ticket screen to the cashier</small>
          </div>

          <p className="waiting-for-cashier__item-15">
            Show your cart identifier to the cashier.
          </p>

          <p className="waiting-for-cashier__item-16">
            {checkoutSubmitting
              ? 'Please wait while your cart is sent to the cashier system.'
              : 'The cashier will retrieve your cart and process your payment.'}
          </p>
          {checkoutError && (
            <div className="waiting-for-cashier__error" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div>
                <strong>Could not send this cart to the cashier</strong>
                <span>{checkoutError}</span>
              </div>
              <button type="button" onClick={confirmCheckout}>
                <RefreshCw aria-hidden="true" /> Retry Checkout
              </button>
            </div>
          )}
          <p className="waiting-for-cashier__payment-note">
            {checkoutError
              ? 'Retry the checkout or ask store staff for assistance.'
              : 'This ticket will remain open until payment is confirmed. The kiosk will then return to Welcome for the next customer.'}
          </p>
        </div>
      </div>
    </div>
  );
};
