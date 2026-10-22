import './VirtualKeyboard.css';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Delete } from 'lucide-react';
import { soundService } from '../services/soundService';

type KeyboardTarget = HTMLInputElement | HTMLTextAreaElement;

const TEXT_INPUT_TYPES = new Set([
  'email',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'url',
]);

const LETTER_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const NUMBER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function isKeyboardTarget(element: Element | null): element is KeyboardTarget {
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly && element.dataset.virtualKeyboard !== 'off';
  }

  return element instanceof HTMLInputElement
    && TEXT_INPUT_TYPES.has(element.type)
    && !element.disabled
    && !element.readOnly
    && element.dataset.virtualKeyboard !== 'off';
}

function setNativeValue(target: KeyboardTarget, value: string) {
  const prototype = target instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  setter?.call(target, value);
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

export const VirtualKeyboard: React.FC = () => {
  const targetRef = useRef<KeyboardTarget | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isShifted, setIsShifted] = useState(false);
  const [mode, setMode] = useState<'letters' | 'numbers'>('letters');

  useEffect(() => {
    const openForTarget = (target: KeyboardTarget) => {
      targetRef.current = target;
      const numeric = target.type === 'number'
        || target.type === 'tel'
        || target.inputMode === 'numeric'
        || target.inputMode === 'decimal';
      setMode(numeric ? 'numbers' : 'letters');
      setIsShifted(false);
      setIsOpen(true);
      document.documentElement.classList.add('virtual-keyboard-open');
      window.setTimeout(() => target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (isKeyboardTarget(target)) {
        openForTarget(target);
      } else if (!(target instanceof HTMLElement && target.closest('.virtual-keyboard'))) {
        targetRef.current = null;
        setIsOpen(false);
        document.documentElement.classList.remove('virtual-keyboard-open');
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.documentElement.classList.remove('virtual-keyboard-open');
    };
  }, []);

  const updateValue = (text: string) => {
    const target = targetRef.current;
    if (!target?.isConnected) return;
    if (target.type === 'number' && text === '.' && target.value.includes('.')) return;

    soundService.playKeyClick();
    target.focus({ preventScroll: true });

    const start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length;
    const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start;
    let nextValue = target.value.slice(0, start) + text + target.value.slice(end);
    if (target.maxLength >= 0) {
      nextValue = nextValue.slice(0, target.maxLength);
    }

    setNativeValue(target, nextValue);
    const caret = Math.min(start + text.length, nextValue.length);
    try {
      target.setSelectionRange(caret, caret);
    } catch {
      // Number inputs do not expose a text selection API.
    }
  };

  const handleBackspace = () => {
    const target = targetRef.current;
    if (!target?.isConnected) return;

    soundService.playKeyClick();
    target.focus({ preventScroll: true });

    const start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length;
    const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start;
    const removeFrom = start === end ? Math.max(0, start - 1) : start;
    const nextValue = target.value.slice(0, removeFrom) + target.value.slice(end);

    setNativeValue(target, nextValue);
    try {
      target.setSelectionRange(removeFrom, removeFrom);
    } catch {
      // Number inputs do not expose a text selection API.
    }
  };

  const closeKeyboard = () => {
    soundService.playKeyClick();
    targetRef.current?.blur();
    targetRef.current = null;
    setIsOpen(false);
    document.documentElement.classList.remove('virtual-keyboard-open');
  };

  if (!isOpen) return null;

  const target = targetRef.current;
  const isEmail = target?.type === 'email';
  const allowsDecimal = target?.type === 'number' || target?.inputMode === 'decimal';

  return (
    <section
      className="virtual-keyboard"
      aria-label="On-screen keyboard"
    >
      <div className="virtual-keyboard__toolbar">
        <button type="button" onClick={() => setMode((current) => current === 'letters' ? 'numbers' : 'letters')}>
          {mode === 'letters' ? '123' : 'ABC'}
        </button>
        <span>On-screen keyboard</span>
        <button type="button" className="virtual-keyboard__done" onClick={closeKeyboard}>
          <Check aria-hidden="true" /> Done
        </button>
      </div>

      {mode === 'numbers' ? (
        <div className="virtual-keyboard__number-grid">
          {NUMBER_KEYS.map((key) => (
            <button type="button" key={key} onClick={() => updateValue(key)}>{key}</button>
          ))}
          {allowsDecimal && <button type="button" onClick={() => updateValue('.')}>.</button>}
          <button type="button" className="virtual-keyboard__wide" onClick={handleBackspace} aria-label="Backspace">
            <Delete aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="virtual-keyboard__letter-grid">
          <div className="virtual-keyboard__row virtual-keyboard__row--numbers">
            {NUMBER_KEYS.map((key) => <button type="button" key={key} onClick={() => updateValue(key)}>{key}</button>)}
          </div>
          {LETTER_ROWS.map((row, rowIndex) => (
            <div className="virtual-keyboard__row" key={row.join('')}>
              {rowIndex === 2 && (
                <button
                  type="button"
                  className={`virtual-keyboard__shift ${isShifted ? 'is-active' : ''}`}
                  onClick={() => setIsShifted((current) => !current)}
                  aria-label="Shift"
                  aria-pressed={isShifted}
                >
                  <ArrowUp aria-hidden="true" />
                </button>
              )}
              {row.map((key) => (
                <button type="button" key={key} onClick={() => updateValue(isShifted ? key.toUpperCase() : key)}>
                  {key.toUpperCase()}
                </button>
              ))}
              {rowIndex === 1 && (
                <button type="button" className="virtual-keyboard__backspace" onClick={handleBackspace} aria-label="Backspace">
                  <Delete aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          <div className="virtual-keyboard__row virtual-keyboard__row--bottom">
            {isEmail && <button type="button" onClick={() => updateValue('@')}>@</button>}
            <button type="button" onClick={() => updateValue('-')}>-</button>
            <button type="button" className="virtual-keyboard__space" onClick={() => updateValue(' ')}>Space</button>
            <button type="button" onClick={() => updateValue('.')}>.</button>
            {isEmail && <button type="button" onClick={() => updateValue('.com')}>.com</button>}
          </div>
        </div>
      )}
    </section>
  );
};
