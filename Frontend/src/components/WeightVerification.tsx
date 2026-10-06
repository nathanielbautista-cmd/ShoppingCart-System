import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Button } from './Button';
import './WeightVerification.css';

interface WeightVerificationProps {
  onContinue: () => void;
  onCancel: () => void;
}

export const WeightVerification: React.FC<WeightVerificationProps> = ({
  onContinue,
  onCancel,
}) => {
  const {
    pendingProduct,
    verificationStatus,
    detectedWeight,
    startProductVerification,
    settings,
  } = useCart();

  const [simulateMismatch, setSimulateMismatch] = useState(false);

  if (!pendingProduct) {
    return (
      <div className="weight-verification__empty">
        <p>No product pending verification.</p>
        <Button onClick={onCancel} className="weight-verification__return-button">
          Return to Cart
        </Button>
      </div>
    );
  }

  const handleRetry = () => {
    startProductVerification(pendingProduct, simulateMismatch);
  };

  return (
    <div className="weight-verification">
      {/* Title & Instructions */}
      <div className="weight-verification__header">
        <div className="weight-verification__badge">
          <Scale className="weight-verification__badge-icon" />
          <span>HX711 Load-Cell Scale Verification</span>
        </div>

        <h2 className="weight-verification__title">
          {verificationStatus === 'VERIFIED'
            ? '✓ ITEM VERIFIED'
            : verificationStatus === 'FAILED'
            ? 'Weight Verification Failed'
            : 'Please place the item inside the cart.'}
        </h2>
        <p className="weight-verification__subtitle">
          {verificationStatus === 'VERIFIED'
            ? `${pendingProduct.name} has been successfully added to your cart.`
            : verificationStatus === 'FAILED'
            ? 'The detected basket weight does not match the expected product weight.'
            : 'The cart load cells are awaiting weight increase inside the basket.'}
        </p>
      </div>

      {/* Main Status & Metrics Card */}
      <div className="weight-verification__content">
        <div
          className={`weight-verification__card ${
            verificationStatus === 'VERIFIED'
              ? 'weight-verification__card--verified'
            : verificationStatus === 'FAILED'
              ? 'weight-verification__card--failed'
              : 'weight-verification__card--default'
          }`}
        >
          {/* Status Badge */}
          <div className="weight-verification__status-wrap">
            {verificationStatus === 'WAITING' && (
              <div className="weight-verification__status weight-verification__status--waiting">
                <Scale className="weight-verification__status-icon" />
                <span>WAITING FOR ITEM</span>
              </div>
            )}
            {verificationStatus === 'VERIFYING' && (
              <div className="weight-verification__status weight-verification__status--verifying">
                <Loader2 className="weight-verification__status-icon weight-verification__spinner" />
                <span>VERIFYING WEIGHT...</span>
              </div>
            )}
            {verificationStatus === 'VERIFIED' && (
              <div className="weight-verification__status weight-verification__status--verified">
                <CheckCircle2 className="weight-verification__status-icon" />
                <span>✓ ITEM VERIFIED</span>
              </div>
            )}
            {verificationStatus === 'FAILED' && (
              <div className="weight-verification__status weight-verification__status--failed">
                <AlertTriangle className="weight-verification__status-icon" />
                <span>FAILED (MISMATCH)</span>
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="weight-verification__product">
            <span className="weight-verification__label">
              Product:
            </span>
            <div className="weight-verification__product-name">
              {pendingProduct.name}
            </div>
            <div className="weight-verification__price">
              {settings.currencySymbol} {pendingProduct.price.toFixed(2)}
            </div>
          </div>

          {/* Scale comparison columns */}
          <div className="weight-verification__metrics">
            <div className="weight-verification__metric">
              <span className="weight-verification__metric-label">
                Expected Weight
              </span>
              <span className="weight-verification__metric-value">
                {pendingProduct.expectedWeightGrams}g
              </span>
              <span className="weight-verification__metric-note">
                Tolerance: ±{settings.weightToleranceGrams}g
              </span>
            </div>

            <div className="weight-verification__metric">
              <span className="weight-verification__metric-label">
                Detected Weight
              </span>
              <span
                className={`weight-verification__metric-value weight-verification__detected-value ${
                  detectedWeight === null
                    ? 'weight-verification__detected-value--waiting'
                    : verificationStatus === 'VERIFIED'
                    ? 'weight-verification__detected-value--verified'
                    : 'weight-verification__detected-value--failed'
                }`}
              >
                {detectedWeight !== null ? `${detectedWeight}g` : 'Waiting...'}
              </span>
              <span className="weight-verification__metric-note">
                HX711 Scale Status: {verificationStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Toggle for Capstone Examiners to test failure state */}
        <div className="weight-verification__diagnostic">
          <label className="weight-verification__diagnostic-label">
            <input
              type="checkbox"
              checked={simulateMismatch}
              onChange={(e) => setSimulateMismatch(e.target.checked)}
              className="weight-verification__checkbox"
            />
            <span>Simulate weight mismatch (Anti-theft test)</span>
          </label>
        </div>
      </div>

      {/* Action Footer */}
      <div className="weight-verification__actions">
        <Button variant="ghost" size="sm" className="weight-verification__cancel" onClick={onCancel}>
          Cancel
        </Button>

        {verificationStatus === 'FAILED' ? (
          <Button
            variant="secondary"
            size="md"
            icon={<RotateCcw className="weight-verification__button-icon" />}
            onClick={handleRetry}
          >
            Retry Scale
          </Button>
        ) : verificationStatus === 'VERIFIED' ? (
          <Button
            variant="glow"
            size="md"
            icon={<ArrowRight className="weight-verification__button-icon weight-verification__continue-icon" />}
            onClick={onContinue}
          >
            CONTINUE
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            disabled={verificationStatus === 'VERIFYING'}
            onClick={() => startProductVerification(pendingProduct, false)}
          >
            Check Scale Now
          </Button>
        )}
      </div>
    </div>
  );
};
