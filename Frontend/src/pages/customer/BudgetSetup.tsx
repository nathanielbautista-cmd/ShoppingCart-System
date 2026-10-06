import './BudgetSetup.css';
import React, { useState } from 'react';
import { ArrowLeft, Check, Delete, Wallet, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';
import { soundService } from '../../services/soundService';

export const BudgetSetup: React.FC = () => {
  const { applyBudget, setCustomerScreen, settings } = useCart();
  const [budgetInput, setBudgetInput] = useState<string>('500');

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
    soundService.playKeyClick();
    const numericBudget = parseFloat(budgetInput) || 0;
    if (numericBudget <= 0) {
      applyBudget(500);
    } else {
      applyBudget(numericBudget);
    }
  };

  const setPreset = (amount: number) => {
    soundService.playKeyClick();
    setBudgetInput(amount.toString());
  };

  const formattedDisplay = parseFloat(budgetInput || '0').toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="budget-setup__item-1">
      {/* Header */}
      <div className="budget-setup__item-2">
        <div className="budget-setup__item-3">
          <Wallet className="budget-setup__item-4" />
          <span>Smart Budget Monitor</span>
        </div>
        <h2 className="budget-setup__item-5">
          Set Your Shopping Budget
        </h2>
      </div>

      {/* Budget Screen Display with glowing emerald border */}
      <div className="budget-setup__item-6">
        <span className="budget-setup__item-7">
          Target Budget Limit
        </span>
        <div className="budget-setup__item-8">
          {settings.currencySymbol} {formattedDisplay}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="budget-setup__item-9">
        {[300, 500, 1000, 2000].map((preset) => (
          <button
            key={preset}
            onClick={() => setPreset(preset)}
            className={`py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
              budgetInput === preset.toString()
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md font-black'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {settings.currencySymbol}{preset}
          </button>
        ))}
      </div>

      {/* Touch Numeric Keypad (Optimized for 800x480 Pi Touchscreen) */}
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

        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="budget-setup__item-12"
        >
          CLR
        </button>

        {/* 0 Button */}
        <button
          onClick={() => handleKeyPress('0')}
          className="budget-setup__item-13"
        >
          0
        </button>

        {/* OK / Confirm Button */}
        <button
          onClick={handleConfirm}
          className="budget-setup__item-14"
        >
          <Check className="budget-setup__item-15" />
          <span>OK</span>
        </button>
      </div>

      {/* Footer Navigation */}
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
