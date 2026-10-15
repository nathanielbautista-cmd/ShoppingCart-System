import React, { useEffect, useRef, useState } from 'react';
import {
  Boxes,
  CalendarDays,
  Image as ImageIcon,
  ShoppingCart,
  Tag,
  Weight,
  X,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { PRODUCT_SCANNED_EVENT, ScannedProductEventDetail } from '../services/scannerEvents';
import './ScannedProductModal.css';

export const ScannedProductModal: React.FC = () => {
  const { settings, startProductVerification, pendingProduct, verificationStatus, weightAnomaly } = useCart();
  const [modalState, setModalState] = useState<ScannedProductEventDetail | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const showProduct = (event: Event) => {
      const detail = (event as CustomEvent<ScannedProductEventDetail>).detail;
      if (!detail?.product) return;
      setImageFailed(false);
      setModalState(detail);
    };

    window.addEventListener(PRODUCT_SCANNED_EVENT, showProduct);
    return () => window.removeEventListener(PRODUCT_SCANNED_EVENT, showProduct);
  }, []);

  useEffect(() => {
    if (!modalState) return;
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalState(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modalState]);

  if (!modalState) return null;

  const { product, requiresAddConfirmation } = modalState;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= product.minimumStock;
  const availabilityLabel = isOutOfStock
    ? 'Out of stock'
    : isLowStock
      ? `Low stock — ${product.stock} available`
      : `${product.stock} available`;
  const expirationDate = product.expirationDate
    ? new Date(product.expirationDate)
    : null;
  const expirationLabel = expirationDate && !Number.isNaN(expirationDate.getTime())
    ? new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(expirationDate)
    : 'Not specified';
  const addIsBusy = Boolean(pendingProduct) && (
    verificationStatus === 'WAITING' || verificationStatus === 'VERIFYING'
  );
  const hasWeightAnomaly = Boolean(weightAnomaly);
  const addIsDisabled = isOutOfStock || hasWeightAnomaly || addIsBusy;
  const addButtonLabel = isOutOfStock
    ? 'Out of Stock'
    : hasWeightAnomaly
      ? 'Remove Unscanned Item'
      : addIsBusy
        ? 'Please Wait'
        : 'Add to Cart';

  const addToCart = () => {
    if (addIsDisabled) return;
    setModalState(null);
    void startProductVerification(product);
  };

  return (
    <div
      className="scanned-product-modal__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setModalState(null);
      }}
    >
      <section
        className="scanned-product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanned-product-title"
        aria-describedby="scanned-product-description"
      >
        <header className="scanned-product-modal__header">
          <div>
            <span>Barcode scanned</span>
            <h2 id="scanned-product-title">{product.name}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="scanned-product-modal__close"
            aria-label="Close product details"
            onClick={() => setModalState(null)}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="scanned-product-modal__body">
          <div className="scanned-product-modal__visual">
            {product.image && !imageFailed ? (
              <img
                src={product.image}
                alt={product.name}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <ImageIcon aria-hidden="true" />
            )}
          </div>

          <div className="scanned-product-modal__content">
            <div className="scanned-product-modal__price-row">
              <div>
                <small>Price</small>
                <strong>{settings.currencySymbol}{product.price.toFixed(2)}</strong>
              </div>
              <span className={`scanned-product-modal__stock scanned-product-modal__stock--${isOutOfStock ? 'out' : isLowStock ? 'low' : 'available'}`}>
                <Boxes aria-hidden="true" />
                {availabilityLabel}
              </span>
            </div>

            <p id="scanned-product-description" className="scanned-product-modal__description">
              {product.description?.trim() || 'No product description is available.'}
            </p>

            <dl className="scanned-product-modal__details">
              <div>
                <dt><Tag aria-hidden="true" /> Category</dt>
                <dd>{product.category || 'Uncategorized'}</dd>
              </div>
              <div>
                <dt><Weight aria-hidden="true" /> Expected weight</dt>
                <dd>{product.expectedWeightGrams > 0 ? `${product.expectedWeightGrams} g` : 'Not specified'}</dd>
              </div>
              <div>
                <dt><CalendarDays aria-hidden="true" /> Expiration date</dt>
                <dd>{expirationLabel}</dd>
              </div>
            </dl>
          </div>
        </div>

        <footer className="scanned-product-modal__footer">
          <span>Product details</span>
          <div className="scanned-product-modal__actions">
            <button
              type="button"
              className="scanned-product-modal__cancel"
              onClick={() => setModalState(null)}
            >
              Close
            </button>
            {requiresAddConfirmation && (
              <button
                type="button"
                className="scanned-product-modal__add"
                disabled={addIsDisabled}
                onClick={addToCart}
              >
                <ShoppingCart aria-hidden="true" />
                {addButtonLabel}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
};
