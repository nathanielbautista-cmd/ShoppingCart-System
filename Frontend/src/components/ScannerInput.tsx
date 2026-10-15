import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { getProductByBarcode } from '../services/productService';
import { announceCapturedBarcode, announceScannedProduct } from '../services/scannerEvents';
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
    customerScreen,
    hasSetBudget,
    pendingProduct,
    verificationStatus,
    weightAnomaly,
    products,
    itemToRemove,
    startItemRemovalVerification,
    cartItems,
    markCashierComplete,
  } = useCart();
  const bufferRef = useRef('');
  const lastScanRef = useRef(0);
  const lastKeyTimeRef = useRef(0);
  const clearBufferTimerRef = useRef<number | null>(null);
  const scanStartedInSearchRef = useRef(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');

  useEffect(() => {
    const resetBuffer = () => {
      bufferRef.current = '';
      lastKeyTimeRef.current = 0;
      scanStartedInSearchRef.current = false;
      if (clearBufferTimerRef.current) {
        window.clearTimeout(clearBufferTimerRef.current);
        clearBufferTimerRef.current = null;
      }
    };

    const submitBufferedBarcode = () => {
      const barcode = bufferRef.current.trim();
      const scanStartedInSearch = scanStartedInSearchRef.current;
      resetBuffer();
      if (!isSupportedBarcode(barcode)) return;

      announceCapturedBarcode(barcode);

      const now = Date.now();
      if (now - lastScanRef.current < 500) return;
      lastScanRef.current = now;
      void handleBarcode(barcode, scanStartedInSearch);
    };

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const scannerEnabledInput = target?.hasAttribute('data-barcode-capture');
      if (
        userMode !== 'CUSTOMER' ||
        !hasSetBudget ||
        (target?.tagName === 'INPUT' && !scannerEnabledInput) ||
        (target?.tagName === 'TEXTAREA' && !scannerEnabledInput) ||
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

        if (!bufferRef.current) {
          scanStartedInSearchRef.current = Boolean(scannerEnabledInput);
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
        const scanStartedInSearch = scanStartedInSearchRef.current;
        resetBuffer();
        if (!isSupportedBarcode(barcode)) return;
        e.preventDefault();
        announceCapturedBarcode(barcode);
        const now = Date.now();
        if (now - lastScanRef.current < 500) return;
        lastScanRef.current = now;
        void handleBarcode(barcode, scanStartedInSearch);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      resetBuffer();
    };
  }, [userMode, customerScreen, hasSetBudget, handleBarcodeScan, startProductVerification, pendingProduct, verificationStatus, weightAnomaly, products]);

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSupportedBarcode(manualBarcode)) {
      setMessage({ text: 'Invalid barcode. Enter 8 to 14 digits.', isError: true });
      window.setTimeout(() => setMessage(null), 3000);
      return;
    }
    void handleBarcode(manualBarcode, false, true);
    setManualBarcode('');
  };

  async function handleBarcode(
    barcode: string,
    requiresAddConfirmation = false,
    simulateSuccess = false
  ) {
    if (!barcode) return;
    if (!requiresAddConfirmation && !simulateSuccess && weightAnomaly) {
      setMessage({
        text: 'Remove the unscanned item first. Then scan its barcode before placing it back.',
        isError: true,
      });
      window.setTimeout(() => setMessage(null), 4000);
      return;
    }
    const activeVerification = verificationStatus === 'VERIFYING' || (
      verificationStatus === 'VERIFIED' && customerScreen === 'PRODUCT_VERIFICATION'
    );
    if (!requiresAddConfirmation && pendingProduct && activeVerification) {
      setMessage({
        text: verificationStatus === 'VERIFIED'
          ? 'Finish the verified item before scanning another product.'
          : `Wait while ${pendingProduct.name} is being checked by the load cells.`,
        isError: true,
      });
      window.setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (requiresAddConfirmation) {
      const catalogProduct = products.find(
        (product) => product.barcode === barcode || product.id === barcode
      );
      if (catalogProduct) {
        announceScannedProduct(catalogProduct, true);
        return;
      }

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
          image: item.image || '',
          expirationDate: item.expirationDate || '',
        };
        announceScannedProduct(product, true);
        return;
      } catch (error) {
        const backendMessage = error instanceof Error ? error.message : '';
        setMessage({
          text: backendMessage || `Barcode ${barcode} was not found.`,
          isError: true,
        });
        window.setTimeout(() => setMessage(null), 4000);
        return;
      }
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
          aisleLocation: item.aisleLocation || '',
          image: item.image || '',
          expirationDate: item.expirationDate || '',
        };
        await startProductVerification(product, false, simulateSuccess);
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

    await startProductVerification(result.product, false, simulateSuccess);
  }

  if (typeof window === 'undefined') return null;

  return (
    <>
      {message && (
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
      )}

      <div className="fixed bottom-4 left-4 z-[100] rounded-lg border bg-white p-4 shadow-lg">
        <p className="mb-2 text-xs font-bold text-gray-500">Simulator (No Scanner Needed)</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Type barcode..."
            value={manualBarcode}
            onChange={(event) => setManualBarcode(event.target.value.replace(/\D/g, ''))}
            className="w-32 rounded border p-1 text-sm text-black"
          />
          <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
            Scan
          </button>
        </form>

        {itemToRemove && (
          <button
            type="button"
            onClick={() => void startItemRemovalVerification(true)}
            className="mt-2 w-full rounded bg-red-600 px-3 py-1 text-sm font-bold text-white hover:bg-red-700"
          >
            Simulate Weight Removal
          </button>
        )}

        {cartItems.length > 0 && (
          <button
            type="button"
            onClick={() => void markCashierComplete(true)}
            className="mt-2 w-full rounded bg-green-600 px-3 py-1 text-sm font-bold text-white hover:bg-green-700"
          >
            Force Checkout Receipt
          </button>
        )}
      </div>
    </>
  );
}
