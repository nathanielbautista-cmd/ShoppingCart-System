import { useEffect, useRef } from 'react';
import api from '../services/api';
import { useCart } from '../context/CartContext';

/** Receives GPIO events posted by hardware/cart_controls.py. */
export const HardwareButtonBridge = () => {
  const after = useRef(0);
  const { confirmPendingProduct, startItemRemovalVerification } = useCart();

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response: any = await api.get(`/hardware/events?after=${after.current}`);
        for (const event of response.events || []) {
          after.current = Math.max(after.current, event.id);
          if (event.action === 'power_on' || event.action === 'power_off' || event.action === 'restart') {
            window.dispatchEvent(new CustomEvent('icart-hardware', { detail: event.action }));
          } else if (event.action === 'add_product') {
            void confirmPendingProduct();
          } else if (event.action === 'remove_product') {
            void startItemRemovalVerification(true);
          }
        }
      } catch {
        // The frontend also runs without the Pi/backend during design work.
      }
      if (active) window.setTimeout(poll, 400);
    };
    void poll();
    return () => { active = false; };
  }, [confirmPendingProduct, startItemRemovalVerification]);

  return null;
};
