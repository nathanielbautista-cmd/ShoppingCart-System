import './BudgetSetup.css';
import React, { useState } from 'react';
import { ArrowLeft, Check, Delete } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';
import { soundService } from '../../services/soundService';

export const BudgetSetup: React.FC = () => {
  const { applyBudget, setCustomerScreen, settings } = useCart();
  const [budgetInput, setBudgetInput] = useState<string>('0');
  const numericBudget = parseInt(budgetInput, 10) || 0;

  const handleKeyPress = (num: string) => {
    soundService.playKeyClick();
    if (budgetInput.length >= 6) return;
    if (budgetInput === '0') {
      setBudgetInput(num);
    } else {
      setBudgetInput((prev) => prev + num);
    }
  };

  const handleClear = () => {
    soundService.playKeyClick();
    setBudgetInput('0');
  };

  const handleBackspace = () => {
    soundService.playKeyClick();
    setBudgetInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleConfirm = () => {
    if (numericBudget <= 0) return;
    soundService.playKeyClick();
    applyBudget(numericBudget);
  };

  const addPreset = (amount: number) => {
    soundService.playKeyClick();
    setBudgetInput((currentInput) => {
      const currentBudget = parseInt(currentInput, 10) || 0;
      return Math.min(currentBudget + amount, 999999).toString();
    });
  };

  const formattedDisplay = parseFloat(budgetInput || '0').toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="budget-setup__item-1">

      <div className="budget-setup__item-2">
        <h2 className="budget-setup__item-5">
          Set Your Shopping Budget
        </h2>
      </div>


      <div className="budget-setup__item-6">
        <span className="budget-setup__item-7">
          Target Budget Limit
        </span>
        <div className="budget-setup__item-8">
          {settings.currencySymbol} {formattedDisplay}
        </div>
      </div>


      <div className="budget-setup__item-9">
        {[100, 500, 1000, 2000].map((preset) => (
          <button
            key={preset}
            onClick={() => addPreset(preset)}
            className="py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            {settings.currencySymbol}{preset}
          </button>
        ))}
      </div>


      <div className="budget-setup__item-10">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleKeyPress(digit)}
            className="budget-setup__item-11"
          >
            {digit}
          </button>
        ))}


        <button
          onClick={handleClear}
          className="budget-setup__item-12"
        >
          CLR
        </button>


        <button
          onClick={() => handleKeyPress('0')}
          className="budget-setup__item-13"
        >
          0
        </button>


        <button
          onClick={handleConfirm}
          disabled={numericBudget <= 0}
          className="budget-setup__item-14"
        >
          <Check className="budget-setup__item-15" />
          <span>OK</span>
        </button>
      </div>


      <div className="budget-setup__item-16">
        <Button
          variant="ghost"
          size="sm"
          className="budget-setup__item-17"
          icon={<ArrowLeft className="budget-setup__item-18" />}
          onClick={() => setCustomerScreen('WELCOME')}
        >
          Back
        </Button>

        <button
          onClick={handleBackspace}
          className="budget-setup__item-19"
        >
          <Delete className="budget-setup__item-20" />
          <span>Backspace</span>
        </button>
      </div>
    </div>
  );
};
