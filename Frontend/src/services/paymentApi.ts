import api from './api';

export const createQrPhPayment = async (
  cartId: string,
  branding?: { storeName: string; storeLogo: string }
) => api.post(`/payments/qrph/${encodeURIComponent(cartId)}`, { branding });

export const getQrPhPayment = async (paymentId: string) =>
  api.get(`/payments/${encodeURIComponent(paymentId)}`);

export const cancelQrPhPayment = async (paymentId: string) =>
  api.post(`/payments/${encodeURIComponent(paymentId)}/cancel`);

export const simulateQrPhSuccess = async (paymentId: string) =>
  api.post(`/payments/${encodeURIComponent(paymentId)}/simulate-success`);

export const getPendingQrPhPayments = async () => api.get('/payments/pending');
