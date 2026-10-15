import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Scale } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';
import './RemoveItem.css';

export const RemoveItem: React.FC = () => {
  const {
    itemToRemove,
    removalStatus,
    cancelItemRemoval,
    startItemRemovalVerification,
    settings,
  } = useCart();

  useEffect(() => {
    if (itemToRemove && removalStatus === 'WAITING_FOR_REMOVAL') {
      void startItemRemovalVerification();
    }
  }, [itemToRemove, removalStatus, startItemRemovalVerification]);

  if (!itemToRemove) {
    return (
      <div className="remove-item-empty">
        <p>No item selected for removal.</p>
        <Button onClick={cancelItemRemoval} className="remove-item-return-button">
          Return to Cart
        </Button>
      </div>
    );
  }

  const { product, quantity } = itemToRemove;

  return (
    <div className="remove-item">

      <div className="remove-item__header">
        <div className="remove-item__icon-wrap">
          <Trash2 className="remove-item__title-icon" />
        </div>

        <h2 className="remove-item__title">
          Remove {product.name}?
        </h2>
      </div>


      <div className="remove-item__content">
        <div className="remove-item__card">
          <div className="remove-item__label">
            Item to Remove
          </div>
          <div className="remove-item__product-name">{product.name}</div>
          <div className="remove-item__price">
            {settings.currencySymbol}{product.price.toFixed(2)} × {quantity} ={' '}
            {settings.currencySymbol}{(product.price * quantity).toFixed(2)}
          </div>
          <div className="remove-item__weight">
            <Scale className="remove-item__weight-icon" />
            <span>Selected-item weight matching is active</span>
          </div>


          <div className="remove-item__verification">
              {removalStatus === 'WAITING_FOR_REMOVAL' && (
                <div className="remove-item__status remove-item__status--waiting">
                  <AlertTriangle className="remove-item__status-icon" />
                  <span>Preparing automatic removal detection...</span>
                </div>
              )}

              {removalStatus === 'VERIFYING_REMOVAL' && (
                <div className="remove-item__status remove-item__status--verifying">
                  <Loader2 className="remove-item__status-icon remove-item__spinner" />
                  <span>Scale armed. Remove the item from the basket now.</span>
                </div>
              )}

              {removalStatus === 'REMOVED' && (
                <div className="remove-item__status remove-item__status--removed">
                  <CheckCircle2 className="remove-item__status-icon" />
                  <span>Item successfully removed from cart!</span>
                </div>
              )}

              {removalStatus === 'REMOVAL_FAILED' && (
                <div className="remove-item__status remove-item__status--failed">
                  <AlertTriangle className="remove-item__status-icon" />
                  <span>No stable decrease detected. Put the item back before retrying.</span>
                </div>
              )}

              {removalStatus === 'REMOVAL_MISMATCH' && (
                <div className="remove-item__status remove-item__status--failed" role="alert">
                  <AlertTriangle className="remove-item__status-icon" />
                  <span>Wrong item removed. Return it, then remove {product.name}.</span>
                </div>
              )}
            </div>
        </div>
      </div>


      <div className="remove-item__actions">
        <Button
          variant="secondary"
          size="md"
          className="remove-item__button"
          disabled={removalStatus === 'REMOVED'}
          icon={<ArrowLeft className="remove-item__button-icon" />}
          onClick={cancelItemRemoval}
        >
          CANCEL
        </Button>

        {(removalStatus === 'REMOVAL_FAILED' || removalStatus === 'REMOVAL_MISMATCH') && (
          <Button
            variant="secondary"
            size="md"
            className="remove-item__button"
            onClick={() => void startItemRemovalVerification()}
          >
            TRY AGAIN
          </Button>
        )}
      </div>
    </div>
  );
};
