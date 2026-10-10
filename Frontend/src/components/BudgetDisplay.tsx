import './BudgetDisplay.css';
import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface BudgetDisplayProps {
  compact?: boolean;
}

export const BudgetDisplay: React.FC<BudgetDisplayProps> = ({ compact = false }) => {
  const {
    budget,
    currentTotal,
    remainingBudget,
    budgetState,
    budgetProgressPercent,
    settings,
  } = useCart();

  const formattedCurrency = (val: number) => {
    return `${settings.currencySymbol}${Math.abs(val).toFixed(2)}`;
  };

  const stateColors = {
    NORMAL: {
      bar: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      border: 'border-emerald-500/30',
      bg: 'bg-slate-900/90',
      icon: <CheckCircle2 className="budget-display__item-1" />,
      message: 'Spending within budget limit.',
    },
    WARNING: {
      bar: 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
      text: 'text-amber-400',
      badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      border: 'border-amber-500/40',
      bg: 'bg-slate-900/90',
      icon: <AlertTriangle className="budget-display__item-2" />,
      message: `Your cart is getting close to your budget (${settings.budgetWarningThreshold}% limit reached).`,
    },
    EXCEEDED: {
      bar: 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]',
      text: 'text-rose-400',
      badge: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      border: 'border-rose-500/50',
      bg: 'bg-slate-900/90',
      icon: <AlertCircle className="budget-display__item-3" />,
      message: `Budget exceeded by ${formattedCurrency(Math.abs(remainingBudget))}.`,
    },
  };

  const currentTheme = stateColors[budgetState];

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-3 py-1.5 rounded-2xl border ${currentTheme.border} ${currentTheme.bg}`}>
        <div className="budget-display__item-4">
          <span className="budget-display__item-5">Total / Budget</span>
          <span className="budget-display__item-6">
            {formattedCurrency(currentTotal)} <span className="budget-display__item-7">/</span> {formattedCurrency(budget)}
          </span>
        </div>
        <div className="budget-display__item-8">
          <div
            className={`h-full transition-all duration-300 ${currentTheme.bar}`}
            style={{ width: `${Math.min(100, budgetProgressPercent)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 sm:p-3.5 rounded-2xl border ${currentTheme.border} ${currentTheme.bg} shadow-lg shadow-black/40 transition-all`}>

      <div className="budget-display__item-9">
        <div className="budget-display__item-10">
          <div className="budget-display__item-11">
            Shopping Budget
          </div>
          <div className="budget-display__item-12">
            {formattedCurrency(budget)}
          </div>
        </div>

        <div className="budget-display__item-13">
          <div className="budget-display__item-14">
            Current Total
          </div>
          <div className="budget-display__item-15">
            {formattedCurrency(currentTotal)}
          </div>
        </div>

        <div className="budget-display__item-16">
          <div className="budget-display__item-17">
            Remaining
          </div>
          <div
            className={`text-base sm:text-lg font-black tabular-nums mt-0.5 ${
              remainingBudget < 0 ? 'text-rose-400' : 'text-cyan-300'
            }`}
          >
            {remainingBudget < 0 ? `-${formattedCurrency(Math.abs(remainingBudget))}` : formattedCurrency(remainingBudget)}
          </div>
        </div>
      </div>


      <div className="budget-display__item-18">
        <div className="budget-display__item-19">
          <span className="budget-display__item-20">
            <TrendingUp className="budget-display__item-21" />
            <span>Budget Consumed</span>
          </span>
          <span className={`tabular-nums font-black ${currentTheme.text}`}>
            {budgetProgressPercent}%
          </span>
        </div>
        <div className="budget-display__item-22">
          <div
            className={`h-full rounded-full transition-all duration-300 ${currentTheme.bar}`}
            style={{ width: `${Math.min(100, budgetProgressPercent)}%` }}
          />
        </div>
      </div>


      <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${currentTheme.badge}`}>
        {currentTheme.icon}
        <span className="budget-display__item-23">{currentTheme.message}</span>
      </div>
    </div>
  );
};
