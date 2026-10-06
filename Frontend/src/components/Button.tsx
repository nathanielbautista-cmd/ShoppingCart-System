import './Button.css';
import React from 'react';
import { soundService } from '../services/soundService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  silent?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  silent = false,
  onClick,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none tracking-tight cursor-pointer';

  const sizeStyles = {
    sm: 'min-h-[40px] px-3.5 py-1.5 text-xs sm:text-sm gap-1.5',
    md: 'min-h-[46px] px-4.5 py-2 text-sm sm:text-base gap-2',
    lg: 'min-h-[52px] px-6 py-2.5 text-base sm:text-lg gap-2.5',
    xl: 'min-h-[58px] px-7 py-3 text-lg sm:text-xl gap-3 font-extrabold',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-950/60 border border-emerald-300/40 active:from-emerald-600 active:to-teal-700',
    glow:
      'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black shadow-xl shadow-emerald-500/25 border border-emerald-200/50 active:scale-95',
    secondary:
      'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 border border-slate-700/90 shadow-md shadow-slate-950/40 active:bg-slate-800',
    danger:
      'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-950/50 border border-rose-400/30 active:bg-rose-700',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/50 border border-emerald-400/30 active:bg-emerald-700',
    outline:
      'bg-slate-900/60 text-slate-200 border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 active:bg-slate-800',
    ghost:
      'bg-transparent text-slate-300 hover:bg-slate-800/80 hover:text-white active:bg-slate-800',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!silent && !disabled) {
      soundService.playKeyClick();
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {icon && <span className="button__item-1">{icon}</span>}
      <span className="button__item-2">{children}</span>
    </button>
  );
};
