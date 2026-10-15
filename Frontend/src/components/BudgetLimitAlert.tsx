import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, WalletCards, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { soundService } from '../services/soundService';
import './BudgetLimitAlert.css';

type BudgetLimitLevel = 'UNDER' | 'REACHED' | 'EXCEEDED';

const getBudgetLimitLevel = (total: number, budget: number): BudgetLimitLevel => {
  if (budget <= 0 || total < budget) return 'UNDER';
  if (total === budget) return 'REACHED';
  return 'EXCEEDED';
};

export const BudgetLimitAlert: React.FC = () => {
  const { budget, currentTotal, hasSetBudget, playVoice, settings, userMode } = useCart();
  const currentLevel = getBudgetLimitLevel(currentTotal, budget);
  const previousLevelRef = useRef<BudgetLimitLevel>(currentLevel);
  const [visibleLevel, setVisibleLevel] = useState<Exclude<BudgetLimitLevel, 'UNDER'> | null>(null);

  useEffect(() => {
    const previousLevel = previousLevelRef.current;
    previousLevelRef.current = currentLevel;

    if (!hasSetBudget || userMode !== 'CUSTOMER' || currentLevel === 'UNDER') {
      setVisibleLevel(null);
      return;
    }

    if (currentLevel === previousLevel) return;

    setVisibleLevel(currentLevel);
    soundService.playWarning();
    playVoice(
      currentLevel === 'REACHED'
        ? 'Budget limit reached. You have no remaining budget.'
        : `Budget exceeded by ${settings.currencySymbol}${(currentTotal - budget).toFixed(2)}. Remove an item or adjust your budget.`
    );
  }, [budget, currentLevel, currentTotal, hasSetBudget, playVoice, settings.currencySymbol, userMode]);

  useEffect(() => {
    if (!visibleLevel) return;
    const timerId = window.setTimeout(() => setVisibleLevel(null), 7000);
    return () => window.clearTimeout(timerId);
  }, [visibleLevel]);

  if (!visibleLevel) return null;

  const isExceeded = visibleLevel === 'EXCEEDED';
  const excessAmount = Math.max(0, currentTotal - budget);

  return (
    <div
      className={`budget-limit-alert ${isExceeded ? 'budget-limit-alert--exceeded' : 'budget-limit-alert--reached'}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="budget-limit-alert__icon" aria-hidden="true">
        {isExceeded ? <AlertTriangle /> : <WalletCards />}
      </div>
      <div className="budget-limit-alert__message">
        <strong>{isExceeded ? 'Budget exceeded' : 'Budget limit reached'}</strong>
        <span>
          {isExceeded
            ? `You are ${settings.currencySymbol}${excessAmount.toFixed(2)} over budget. Remove an item or adjust your budget.`
            : 'You have used your full budget. Review your cart before adding another item.'}
        </span>
      </div>
      <button
        type="button"
        className="budget-limit-alert__close"
        onClick={() => setVisibleLevel(null)}
        aria-label="Dismiss budget alert"
      >
        <X />
      </button>
    </div>
  );
};
