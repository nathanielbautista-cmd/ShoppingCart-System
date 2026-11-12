import './Budget.css';
import React, { useState } from 'react';
import {
  Check,
  Delete,
  Edit3,
  ReceiptText,
  ShoppingCart,
  Wallet,
  X,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { soundService } from '../../services/soundService';

const BUDGET_INCREMENTS = [10, 20, 50, 100, 500, 1000, 5000, 10000];

export const Budget: React.FC = () => {
  const {
    budget,
    currentTotal,
    remainingBudget,
    budgetState,
    budgetProgressPercent,
    applyBudget,
    settings,
  } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(budget.toString());

  const formatCurrency = (amount: number) => `${settings.currencySymbol}${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const proposedBudget = parseInt(newBudget, 10) || 0;
  const formattedProposedBudget = proposedBudget.toLocaleString('en-US');
  const progress = Math.max(0, Math.min(100, budgetProgressPercent));

  const handleToggleEdit = () => {
    soundService.playKeyClick();
    if (!isEditing) setNewBudget(budget.toString());
    setIsEditing((editing) => !editing);
  };

  const handleAddBudget = (amount: number) => {
    soundService.playKeyClick();
    setNewBudget((currentBudget) => Math.min((parseInt(currentBudget, 10) || 0) + amount, 999999).toString());
  };

  const handleBackspace = () => {
    soundService.playKeyClick();
    setNewBudget((currentBudget) => (
      currentBudget.length > 1 ? currentBudget.slice(0, -1) : '0'
    ));
  };

  const handleSaveBudget = () => {
    if (proposedBudget <= 0) return;
    soundService.playKeyClick();
    applyBudget(proposedBudget);
    setIsEditing(false);
  };

  return (
    <main className={`budget-page budget-page--${budgetState.toLowerCase()}`}>
      <header className="budget-page__header">
        <div className="budget-page__heading">
          <span className="budget-page__heading-icon" aria-hidden="true"><Wallet /></span>
          <span>
            <h1>My Budget</h1>
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleEdit}
          className={`budget-page__edit ${isEditing ? 'is-active' : ''}`}
          aria-expanded={isEditing}
          aria-controls="budget-editor"
        >
          {isEditing ? <X aria-hidden="true" /> : <Edit3 aria-hidden="true" />}
          <span>{isEditing ? 'Cancel' : 'Adjust budget'}</span>
        </button>
      </header>

      <section className="budget-overview" aria-label="Budget overview">
        <div className="budget-overview__primary">
          <div className="budget-overview__remaining">
            <span>Available to spend</span>
            <strong className={remainingBudget < 0 ? 'is-negative' : ''}>
              {remainingBudget < 0 ? '-' : ''}{formatCurrency(remainingBudget)}
            </strong>
          </div>

          <div className="budget-overview__progress">
            <div className="budget-overview__progress-copy">
              <span>Budget used</span>
              <strong>{budgetProgressPercent}%</strong>
            </div>
            <div
              className="budget-overview__track"
              role="progressbar"
              aria-label="Budget used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="budget-overview__scale" aria-hidden="true">
              <span>{formatCurrency(0)}</span>
              <span>{formatCurrency(budget)}</span>
            </div>
          </div>
        </div>

        <div className="budget-metrics">
          <article className="budget-metric">
            <span className="budget-metric__icon"><Wallet aria-hidden="true" /></span>
            <span><small>Budget limit</small><strong>{formatCurrency(budget)}</strong></span>
          </article>
          <article className="budget-metric">
            <span className="budget-metric__icon"><ShoppingCart aria-hidden="true" /></span>
            <span><small>Cart total</small><strong>{formatCurrency(currentTotal)}</strong></span>
          </article>
          <article className="budget-metric">
            <span className="budget-metric__icon"><ReceiptText aria-hidden="true" /></span>
            <span><small>Difference</small><strong className={remainingBudget < 0 ? 'is-negative' : ''}>{remainingBudget < 0 ? '-' : '+'}{formatCurrency(remainingBudget)}</strong></span>
          </article>
        </div>
      </section>

      {isEditing && (
        <section className="budget-editor" id="budget-editor" aria-label="Adjust budget limit">
          <div className="budget-editor__amount">
            <span>New budget limit</span>
            <output aria-live="polite">{settings.currencySymbol}{formattedProposedBudget}</output>
          </div>

          <div className="budget-editor__increments" aria-label="Quick budget additions">
            {BUDGET_INCREMENTS.map((amount) => (
              <button
                type="button"
                key={amount}
                onClick={() => handleAddBudget(amount)}
                aria-label={`Add ${settings.currencySymbol}${amount.toLocaleString('en-US')} to budget`}
              >
                +{settings.currencySymbol}{amount.toLocaleString('en-US')}
              </button>
            ))}
          </div>

          <div className="budget-editor__actions">
            <button type="button" className="budget-editor__backspace" onClick={handleBackspace}>
              <Delete aria-hidden="true" />
              <span>Backspace</span>
            </button>
            <button
              type="button"
              className="budget-editor__save"
              onClick={handleSaveBudget}
              disabled={proposedBudget <= 0}
            >
              <Check aria-hidden="true" />
              <span>Save new budget</span>
            </button>
          </div>
        </section>
      )}
    </main>
  );
};
