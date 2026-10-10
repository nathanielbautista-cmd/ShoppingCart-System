import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { getProductByBarcode } from '../services/productService';
import { Product } from '../types';

const MIN_BARCODE_LENGTH = 8;
const MAX_BARCODE_LENGTH = 14;
const MAX_SCANNER_KEY_GAP_MS = 80;
const SCAN_END_DELAY_MS = 120;

const isSupportedBarcode = (value: string) => (
  /^\d+$/.test(value) &&
  value.length >= MIN_BARCODE_LENGTH &&
  value.length <= MAX_BARCODE_LENGTH
);


export default function ScannerInput() {
  const {
    handleBarcodeScan,
    startProductVerification,
    userMode,
    hasSetBudget,
    pendingProduct,
    verificationStatus,
  } = useCart();
  const bufferRef = useRef('');
  const lastScanRef = useRef(0);
  const lastKeyTimeRef = useRef(0);
  const clearBufferTimerRef = useRef<number | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    const resetBuffer = () => {
      bufferRef.current = '';
      lastKeyTimeRef.current = 0;
      if (clearBufferTimerRef.current) {
        window.clearTimeout(clearBufferTimerRef.current);
        clearBufferTimerRef.current = null;
      }
    };

    const submitBufferedBarcode = () => {
      const barcode = bufferRef.current.trim();
      resetBuffer();
      if (!isSupportedBarcode(barcode)) return;

      const now = Date.now();
      if (now - lastScanRef.current < 500) return;
      lastScanRef.current = now;
      void handleBarcode(barcode);
    };

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        userMode !== 'CUSTOMER' ||
        !hasSetBudget ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key.length === 1) {

        if (e.repeat) return;



        if (!/^\d$/.test(e.key)) {
          resetBuffer();
          return;
        }

        const now = performance.now();
        if (
          bufferRef.current &&
          lastKeyTimeRef.current &&
          now - lastKeyTimeRef.current > MAX_SCANNER_KEY_GAP_MS
        ) {
          resetBuffer();
        }

        bufferRef.current += e.key;
        lastKeyTimeRef.current = now;
        if (bufferRef.current.length > MAX_BARCODE_LENGTH) {
          resetBuffer();
          return;
        }

        if (clearBufferTimerRef.current) {
          window.clearTimeout(clearBufferTimerRef.current);
        }


        clearBufferTimerRef.current = window.setTimeout(submitBufferedBarcode, SCAN_END_DELAY_MS);
      } else if (e.key === 'Enter' || e.key === 'Tab') {

        const barcode = bufferRef.current.trim();
        resetBuffer();
        if (!isSupportedBarcode(barcode)) return;
        e.preventDefault();
        const now = Date.now();
        if (now - lastScanRef.current < 500) return;
        lastScanRef.current = now;
        void handleBarcode(barcode);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      resetBuffer();
    };
  }, [userMode, hasSetBudget, handleBarcodeScan, startProductVerification, pendingProduct, verificationStatus]);

  async function handleBarcode(barcode: string) {
    if (!barcode) return;
    if (pendingProduct && (verificationStatus === 'VERIFYING' || verificationStatus === 'VERIFIED')) {
      setMessage({
        text: verificationStatus === 'VERIFIED'
          ? 'Finish the verified item before scanning another product.'
          : `Wait while ${pendingProduct.name} is being checked by the load cells.`,
        isError: true,
      });
      window.setTimeout(() => setMessage(null), 3000);
      return;
    }
    const result = handleBarcodeScan(barcode);
    if (!result.success || !result.product) {

      try {
        const response = await getProductByBarcode(barcode);
        const item = response.product;
        const product: Product = {
          id: item.id || item._id,
          barcode: item.barcode,
          name: item.name,
          category: item.category || '',
          price: item.price,
          expectedWeightGrams: item.weight || 0,
          stock: item.stock || 0,
          minimumStock: item.minimumStock ?? 5,
          description: item.description || '',
        };
        setMessage({ text: `${product.name} detected. Checking item weight…`, isError: false });
        await startProductVerification(product);
        window.setTimeout(() => setMessage(null), 2500);
        return;
      } catch (error) {
        const backendMessage = error instanceof Error ? error.message : '';
        setMessage({
          text: backendMessage || result.error || `Barcode ${barcode} was not found.`,
          isError: true,
        });
        window.setTimeout(() => setMessage(null), 4000);
        return;
      }
    }

    setMessage({ text: `${result.product.name} detected. Checking item weight…`, isError: false });
    await startProductVerification(result.product);
    window.setTimeout(() => setMessage(null), 2500);
  }

  if (typeof window === 'undefined') return null;

  return message ? (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-4 z-[100] w-[min(92vw,460px)] -translate-x-1/2 rounded-xl border px-4 py-3 text-center text-sm font-bold shadow-xl ${
        message.isError
          ? 'border-rose-400/60 bg-rose-950 text-rose-100'
          : 'border-emerald-400/60 bg-emerald-950 text-emerald-100'
      }`}
    >
      {message.text}
    </div>
  ) : null;
}
