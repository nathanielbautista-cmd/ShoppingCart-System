import api from './api';

export const createCart = async (body?: any) => api.post('/cart', body || {});
export const getCart = async (cartId: string) => api.get(`/cart/${encodeURIComponent(cartId)}`);
export const addCartItem = async (cartId: string, payload: any) => api.post(`/cart/${encodeURIComponent(cartId)}/items`, payload);
export const updateCartItem = async (cartId: string, itemId: string, payload: any) => api.put(`/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`, payload);
export const removeCartItem = async (cartId: string, itemId: string) => api.del(`/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`);
export const updateBudget = async (cartId: string, payload: any) => api.put(`/cart/${encodeURIComponent(cartId)}/budget`, payload);
export const requestCashierCheckout = async (cartId: string) => api.post(`/checkout/${encodeURIComponent(cartId)}/request-cashier`);
export const checkoutCart = async (cartId: string, payload?: any) => api.post(`/checkout/${encodeURIComponent(cartId)}`, payload || {});
export const getWaitingCarts = async () => api.get('/checkout/waiting');
export const getCartTransactions = async (cartId: string) => api.get(`/checkout/transactions?cartId=${encodeURIComponent(cartId)}&limit=1`);
export const reportWeightAnomaly = async (cartId: string, anomalyWeight: number, note?: string) => api.post(
  `/cart/${encodeURIComponent(cartId)}/weight-anomaly`,
  { anomalyWeight, note: note || `Unexpected basket weight change (${anomalyWeight.toFixed(1)}g)` }
);
export const clearWeightAnomaly = async (cartId: string) => api.post(`/cart/${encodeURIComponent(cartId)}/clear-anomaly`);
