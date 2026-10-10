import React, { useState } from 'react';
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

  const [hasConfirmed, setHasConfirmed] = useState(false);

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

  const handleConfirmRemove = () => {
    setHasConfirmed(true);
    startItemRemovalVerification();
  };

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
            <span>Expected basket scale reduction: -{product.expectedWeightGrams * quantity}g</span>
          </div>


          {hasConfirmed && (
            <div className="remove-item__verification">
              {removalStatus === 'WAITING_FOR_REMOVAL' && (
                <div className="remove-item__status remove-item__status--waiting">
                  <AlertTriangle className="remove-item__status-icon" />
                  <span>Press confirm, then remove the item from the basket.</span>
                </div>
              )}

              {removalStatus === 'VERIFYING_REMOVAL' && (
                <div className="remove-item__status remove-item__status--verifying">
                  <Loader2 className="remove-item__status-icon remove-item__spinner" />
                  <span>Verifying weight deduction on scale...</span>
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
                  <span>Removal failed. Basket weight did not decrease.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      <div className="remove-item__actions">
        <Button
          variant="secondary"
          size="md"
          className="remove-item__button"
          disabled={hasConfirmed && removalStatus === 'VERIFYING_REMOVAL'}
          icon={<ArrowLeft className="remove-item__button-icon" />}
          onClick={cancelItemRemoval}
        >
          CANCEL
        </Button>

        {!hasConfirmed ? (
          <Button
            variant="danger"
            size="md"
            className="remove-item__button"
            icon={<Trash2 className="remove-item__button-icon" />}
            onClick={handleConfirmRemove}
          >
            START SCALE CHECK
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            className="remove-item__button"
            disabled={removalStatus === 'VERIFYING_REMOVAL'}
            onClick={handleConfirmRemove}
          >
            RE-CHECK SCALE
          </Button>
        )}
      </div>
    </div>
  );
};
