import './Budget.css';
import React, { useState } from 'react';
import { ArrowLeft, Wallet, Edit3, Check, Delete } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { BudgetDisplay } from '../../components/BudgetDisplay';
import { Button } from '../../components/Button';
import { soundService } from '../../services/soundService';

const BUDGET_INCREMENTS = [10, 20, 50, 100, 500, 1000, 5000, 10000];

export const Budget: React.FC = () => {
  const { setCustomerScreen, budget, applyBudget, settings } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(budget.toString());

  const handleToggleEdit = () => {
    soundService.playKeyClick();
    if (!isEditing) {
      setNewBudget(budget.toString());
    }
    setIsEditing((editing) => !editing);
  };

  const handleAddBudget = (amount: number) => {
    soundService.playKeyClick();
    setNewBudget((currentBudget) => ((parseInt(currentBudget, 10) || 0) + amount).toString());
  };

  const handleBackspace = () => {
    soundService.playKeyClick();
    setNewBudget((currentBudget) => (
      currentBudget.length > 1 ? currentBudget.slice(0, -1) : '0'
    ));
  };

  const handleSaveBudget = () => {
    soundService.playKeyClick();
    const numericBudget = parseInt(newBudget, 10) || 0;
    if (numericBudget > 0) {
      applyBudget(numericBudget);
    }
    setIsEditing(false);
  };

  const formattedBudget = (parseInt(newBudget, 10) || 0).toLocaleString('en-US');

  return (
    <div className="budget__item-1">
      {/* Header */}
      <div className="budget__item-2">
        <div className="budget__item-3">
          <div className="budget__item-4">
            <Wallet className="budget__item-5" />
          </div>
          <div>
            <h2 className="budget__item-6">
              Budget Monitoring
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleEdit}
          className="budget__item-7"
        >
          <Edit3 className="budget__item-8" />
          <span>{isEditing ? 'Cancel Edit' : 'Adjust Budget'}</span>
        </button>
      </div>

      {/* Main Budget Display */}
      <div className="budget__item-9">
        <BudgetDisplay />

        {/* Quick Edit Budget Modal / Drawer if toggled */}
        {isEditing && (
          <div className="budget__item-10">
            <span className="budget__item-11">
              Update Budget Limit:
            </span>
            <div className="budget__item-12">
              <div
                className="budget__item-13"
              >
                <output aria-label="New budget limit">
                  {settings.currencySymbol}{formattedBudget}
                </output>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="budget__backspace"
                  aria-label="Remove last budget digit"
                >
                  <Delete aria-hidden="true" />
                </button>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={<Check className="budget__item-14" />}
                onClick={handleSaveBudget}
              >
                Save
              </Button>
            </div>
            <div className="budget__item-15">
              {BUDGET_INCREMENTS.map((amount) => (
                <button
                  type="button"
                  key={amount}
                  onClick={() => handleAddBudget(amount)}
                  className="budget__item-16"
                  aria-label={`Add ${settings.currencySymbol}${amount.toLocaleString('en-US')} to budget`}
                >
                  +{settings.currencySymbol}{amount.toLocaleString('en-US')}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Action Footer */}
      <div className="budget__item-18">
        <Button
          variant="secondary"
          size="lg"
          className="budget__item-19"
          icon={<ArrowLeft className="budget__item-20" />}
          onClick={() => setCustomerScreen('SHOPPING_HOME')}
        >
          RETURN TO SHOPPING
        </Button>
      </div>
    </div>
  );
};
