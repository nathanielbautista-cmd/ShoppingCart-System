import { useEffect, useRef } from 'react';
import api from '../services/api';
import { useCart } from '../context/CartContext';


export const HardwareButtonBridge = () => {
  const after = useRef<number | null>(null);
  const { confirmPendingProduct, startItemRemovalVerification } = useCart();

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
            void confirmPendingProduct();
          } else if (event.action === 'delete_product' || event.action === 'remove_product') {
            void startItemRemovalVerification();
          }
        }
      } catch {

      }
      if (active) window.setTimeout(poll, 400);
    };
    void poll();
    return () => { active = false; };
  }, [confirmPendingProduct, startItemRemovalVerification]);

  return null;
};
