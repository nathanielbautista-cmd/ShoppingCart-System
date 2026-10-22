import './KioskKeyboard.css';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, CornerDownLeft, Delete, Globe2 } from 'lucide-react';
import { soundService } from '../services/soundService';

type KeyboardTarget = HTMLInputElement | HTMLTextAreaElement;

const SUPPORTED_INPUT_TYPES = new Set([
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

const SYMBOL_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')'],
  ['!', '"', "'", ':', ';', '/', '?', '_'],
];

function isKeyboardTarget(element: Element | null): element is KeyboardTarget {
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly && element.dataset.virtualKeyboard !== 'off';
  }

  return element instanceof HTMLInputElement
    && SUPPORTED_INPUT_TYPES.has(element.type)
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

export const KioskKeyboard: React.FC = () => {
  const targetRef = useRef<KeyboardTarget | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isShifted, setIsShifted] = useState(false);
  const [layout, setLayout] = useState<'letters' | 'symbols'>('letters');

  const closeKeyboard = (blurTarget = true) => {
    if (blurTarget) targetRef.current?.blur();
    targetRef.current = null;
    setIsOpen(false);
    setIsShifted(false);
    document.documentElement.classList.remove('kiosk-keyboard-open');
  };

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!isKeyboardTarget(target)) return;

      targetRef.current = target;
      const needsSymbols = target.type === 'number'
        || target.type === 'tel'
        || target.inputMode === 'numeric'
        || target.inputMode === 'decimal';
      setLayout(needsSymbols ? 'symbols' : 'letters');
      setIsShifted(false);
      setIsOpen(true);
      document.documentElement.classList.add('kiosk-keyboard-open');
      window.setTimeout(() => target.scrollIntoView({ block: 'nearest' }), 0);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      if (!targetRef.current || element?.closest('.kiosk-keyboard') || isKeyboardTarget(element)) return;
      closeKeyboard();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.documentElement.classList.remove('kiosk-keyboard-open');
    };
  }, []);

  const insertText = (text: string) => {
    const target = targetRef.current;
    if (!target?.isConnected) return;
    if (target.type === 'number' && text === '.' && target.value.includes('.')) return;

    soundService.playKeyClick();
    target.focus({ preventScroll: true });

    const start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length;
    const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start;
    let nextValue = target.value.slice(0, start) + text + target.value.slice(end);
    if (target.maxLength >= 0) nextValue = nextValue.slice(0, target.maxLength);

    setNativeValue(target, nextValue);
    const caret = Math.min(start + text.length, nextValue.length);
    try {
      target.setSelectionRange(caret, caret);
    } catch {
      // Number inputs do not expose selection positions.
    }
  };

  const backspace = () => {
    const target = targetRef.current;
    if (!target?.isConnected) return;

    soundService.playKeyClick();
    target.focus({ preventScroll: true });

    const start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length;
    const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start;
    const removeFrom = start === end ? Math.max(0, start - 1) : start;
    setNativeValue(target, target.value.slice(0, removeFrom) + target.value.slice(end));
    try {
      target.setSelectionRange(removeFrom, removeFrom);
    } catch {
      // Number inputs do not expose selection positions.
    }
  };

  const handleReturn = () => {
    const target = targetRef.current;
    soundService.playKeyClick();
    if (target instanceof HTMLTextAreaElement) {
      insertText('\n');
      return;
    }
    closeKeyboard();
  };

  if (!isOpen) return null;

  const activeRows = layout === 'letters' ? LETTER_ROWS : SYMBOL_ROWS;
  const isNumericTarget = targetRef.current?.type === 'number'
    || targetRef.current?.type === 'tel'
    || targetRef.current?.inputMode === 'numeric'
    || targetRef.current?.inputMode === 'decimal';

  return (
    <section className="kiosk-keyboard" aria-label="On-screen keyboard">
      <div className="kiosk-keyboard__row kiosk-keyboard__row--top">
        {activeRows[0].map((key) => (
          <button type="button" key={key} onClick={() => insertText(isShifted ? key.toUpperCase() : key)}>{key}</button>
        ))}
      </div>

      <div className={`kiosk-keyboard__row kiosk-keyboard__row--middle ${activeRows[1].length === 9 ? 'kiosk-keyboard__row--nine' : ''}`}>
        {activeRows[1].map((key) => (
          <button type="button" key={key} onClick={() => insertText(isShifted ? key.toUpperCase() : key)}>{key}</button>
        ))}
      </div>

      <div className={`kiosk-keyboard__row kiosk-keyboard__row--shift ${activeRows[2].length === 8 ? 'kiosk-keyboard__row--eight' : ''}`}>
        <button
          type="button"
          className={`kiosk-keyboard__modifier ${isShifted ? 'is-active' : ''}`}
          onClick={() => setIsShifted((current) => !current)}
          aria-label="Shift"
          aria-pressed={isShifted}
        >
          <ArrowUp aria-hidden="true" />
        </button>
        {activeRows[2].map((key) => (
          <button type="button" key={key} onClick={() => insertText(isShifted ? key.toUpperCase() : key)}>{key}</button>
        ))}
        <button type="button" className="kiosk-keyboard__modifier" onClick={backspace} aria-label="Backspace">
          <Delete aria-hidden="true" />
        </button>
      </div>

      <div className="kiosk-keyboard__row kiosk-keyboard__row--bottom">
        <button type="button" className="kiosk-keyboard__mode" onClick={() => setLayout((current) => current === 'letters' ? 'symbols' : 'letters')}>
          {layout === 'letters' ? '123' : 'ABC'}
        </button>
        <button type="button" className="kiosk-keyboard__globe" aria-label="English keyboard">
          <Globe2 aria-hidden="true" />
        </button>
        <button type="button" className="kiosk-keyboard__space" onClick={() => insertText(' ')} aria-label="Space" />
        <button type="button" onClick={() => insertText('.')}>.</button>
        <button type="button" className="kiosk-keyboard__return" onClick={handleReturn} aria-label="Return">
          <CornerDownLeft aria-hidden="true" />
        </button>
      </div>

      {isNumericTarget && layout === 'symbols' && (
        <span className="sr-only">Numeric keyboard active</span>
      )}
    </section>
  );
};
