import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './ProductVerificationFeedback.css';

export const ProductVerificationFeedback: React.FC = () => {
  const { pendingProduct, scanError, verificationStatus } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pendingProduct) {
      setVisible(false);
      return;
    }

    setVisible(true);
    if (verificationStatus !== 'VERIFIED' && verificationStatus !== 'FAILED') return;

    const timerId = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(timerId);
  }, [pendingProduct, verificationStatus]);

  if (!pendingProduct || !visible) return null;

  const isSuccess = verificationStatus === 'VERIFIED';
  const isFailure = verificationStatus === 'FAILED';
  const isScaleReady = verificationStatus === 'VERIFYING';

  return (
    <div
      className={`product-feedback product-feedback--${isSuccess ? 'success' : isFailure ? 'error' : 'checking'}`}
      role={isFailure ? 'alert' : 'status'}
      aria-live={isFailure ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {isSuccess ? (
        <CheckCircle2 className="product-feedback__icon" />
      ) : isFailure ? (
        <AlertTriangle className="product-feedback__icon" />
      ) : (
        <Loader2 className="product-feedback__icon product-feedback__spinner" />
      )}
      <div>
        <strong>
          {isSuccess
            ? `${pendingProduct.name} added to cart`
            : isFailure
              ? `${pendingProduct.name} was not added`
              : isScaleReady
                ? `Place ${pendingProduct.name} in the basket now`
                : 'Preparing the scale'}
        </strong>
        <span>
          {isSuccess
            ? 'Item confirmed successfully.'
            : isFailure
              ? scanError || 'The item could not be confirmed. Please try scanning it again.'
              : isScaleReady
                ? 'Scale ready. Place only the scanned item in the basket.'
                : 'Keep the basket still while its current weight is captured.'}
        </span>
      </div>
    </div>
  );
};
