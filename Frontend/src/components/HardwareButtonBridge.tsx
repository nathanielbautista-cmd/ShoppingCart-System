import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useCart } from '../context/CartContext';


export const HardwareButtonBridge = () => {
  const after = useRef<number | null>(null);
  const messageTimer = useRef<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    cartItems,
    confirmPendingProduct,
    itemToRemove,
    pendingProduct,
    playVoice,
    startItemRemovalVerification,
    verificationStatus,
  } = useCart();

  const showMessage = (text: string) => {
    setMessage(text);
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response: any = await api.get(`/hardware/events?after=${after.current ?? 0}`);


        if (after.current === null) {
          after.current = Number(response.latestId) || 0;
          if (typeof response.powered === 'boolean') {
            window.dispatchEvent(new CustomEvent('icart-hardware', {
              detail: response.powered ? 'power_on' : 'power_off',
            }));
          }
          if (active) window.setTimeout(poll, 400);
          return;
        }
        for (const event of response.events || []) {
          after.current = Math.max(after.current, event.id);
          if (event.action === 'power_on' || event.action === 'power_off' || event.action === 'restart') {
            window.dispatchEvent(new CustomEvent('icart-hardware', { detail: event.action }));
          } else if (event.action === 'add_product') {
            if (!pendingProduct) {
              const text = 'Add: scan a product first.';
              showMessage(text);
              playVoice(text);
            } else if (verificationStatus === 'VERIFYING') {
              showMessage(`Add: ${pendingProduct.name} is already being verified.`);
            } else if (verificationStatus === 'VERIFIED') {
              showMessage(`Add: ${pendingProduct.name} is already in your cart.`);
            } else {
              showMessage(`Add: checking ${pendingProduct.name}. Place it in the basket when prompted.`);
              void confirmPendingProduct();
            }
          } else if (event.action === 'delete_product' || event.action === 'remove_product') {
            if (itemToRemove) {
              showMessage(`Remove: checking ${itemToRemove.product.name}.`);
              void startItemRemovalVerification();
            } else if (cartItems.length === 0) {
              const text = 'Remove: your cart is empty.';
              showMessage(text);
              playVoice(text);
            } else {
              const text = 'Remove: take one scanned item out now. The scale will identify and deduct it automatically.';
              showMessage(text);
              playVoice(text);
            }
          }
        }
      } catch {

      }
      if (active) window.setTimeout(poll, 400);
    };
    void poll();
    return () => { active = false; };
  }, [cartItems, confirmPendingProduct, itemToRemove, pendingProduct, playVoice, startItemRemovalVerification, verificationStatus]);

  useEffect(() => () => {
    if (messageTimer.current !== null) window.clearTimeout(messageTimer.current);
  }, []);

  return message ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-4 z-[180] w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-cyan-400/60 bg-slate-950 px-4 py-3 text-center text-sm font-bold text-cyan-100 shadow-xl"
    >
      {message}
    </div>
  ) : null;
};
