import './Modal.css';
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="modal__item-1">
      <div
        className={`w-full ${maxWidthStyles[maxWidth]} bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 sm:p-6 overflow-hidden flex flex-col max-h-[92vh] text-slate-100`}
      >
        {/* Header */}
        <div className="modal__item-2">
          <h3 className="modal__item-3">{title}</h3>
          <button
            onClick={onClose}
            className="modal__item-4"
          >
            <X className="modal__item-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal__item-6">{children}</div>
      </div>
    </div>
  );
};
