import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { RemovalStatus } from '../types';
import './RemovalFeedback.css';

interface FeedbackSnapshot {
  productName: string;
  quantity: number;
  status: RemovalStatus;
}

export const RemovalFeedback: React.FC = () => {
  const {
    itemToRemove,
    removalStatus,
    cancelItemRemoval,
    startItemRemovalVerification,
  } = useCart();
  const [feedback, setFeedback] = useState<FeedbackSnapshot | null>(null);

  useEffect(() => {
    if (itemToRemove) {
      setFeedback({
        productName: itemToRemove.product.name,
        quantity: itemToRemove.quantity,
        status: removalStatus,
      });
      return;
    }

    setFeedback((current) => current?.status === 'REMOVED' ? current : null);
  }, [itemToRemove, removalStatus]);

  useEffect(() => {
    if (feedback?.status !== 'REMOVED') return;
    const timerId = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timerId);
  }, [feedback?.status]);

  if (!feedback) return null;

  const isSuccess = feedback.status === 'REMOVED';
  const isMismatch = feedback.status === 'REMOVAL_MISMATCH';
  const isFailure = feedback.status === 'REMOVAL_FAILED' || isMismatch;
  const isChecking = !isSuccess && !isFailure;
  const quantityLabel = feedback.quantity > 1 ? `${feedback.quantity} × ` : '';

  const title = isSuccess
    ? `${quantityLabel}${feedback.productName} removed from cart`
    : isMismatch
      ? 'Wrong item removed'
      : isFailure
        ? `${feedback.productName} was not removed`
        : feedback.status === 'WAITING_FOR_REMOVAL'
          ? `Preparing to remove ${feedback.productName}`
          : `Remove ${quantityLabel}${feedback.productName} now`;

  const detail = isSuccess
    ? 'Your cart total and quantity were updated.'
    : isMismatch
      ? `Return the item you removed, then retry with ${feedback.productName}.`
      : isFailure
        ? 'No matching stable weight decrease was detected.'
        : feedback.status === 'WAITING_FOR_REMOVAL'
          ? 'Keep the item in the basket while the scale prepares.'
          : 'Take only the selected item out of the basket.';

  const cancel = () => {
    cancelItemRemoval();
    setFeedback(null);
  };

  return (
    <div
      className={`removal-feedback removal-feedback--${isSuccess ? 'success' : isFailure ? 'error' : 'checking'}`}
      role={isFailure ? 'alert' : 'status'}
      aria-live={isFailure ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {isSuccess ? (
        <CheckCircle2 className="removal-feedback__icon" />
      ) : isFailure ? (
        <AlertTriangle className="removal-feedback__icon" />
      ) : (
        <Loader2 className="removal-feedback__icon removal-feedback__spinner" />
      )}
      <div className="removal-feedback__copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      {isFailure && (
        <div className="removal-feedback__actions">
          <button type="button" onClick={() => void startItemRemovalVerification()}>Retry</button>
          <button type="button" onClick={cancel} aria-label="Cancel item removal"><X /></button>
        </div>
      )}
    </div>
  );
};
