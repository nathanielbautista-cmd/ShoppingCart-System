import api, { setAuthToken } from './api';

export const loginAdmin = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  setAuthToken(response.token);
  return response;
};

export const logoutAdmin = () => setAuthToken(null);

export const getInventory = async () => api.get('/inventory');
export const adjustStock = async (productId: string, action: 'add' | 'subtract' | 'set', quantity: number) =>
  api.put(`/inventory/${encodeURIComponent(productId)}/stock`, { action, quantity, reason: 'Admin dashboard adjustment' });
export const getTransactions = async () => api.get('/checkout/transactions?limit=100');
export const getReportSummary = async (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return api.get(`/reports/summary${params.size ? `?${params.toString()}` : ''}`);
};
