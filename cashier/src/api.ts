const base = import.meta.env.VITE_API_URL || '/api';
let token = localStorage.getItem('icart_cashier_token') || '';
export const setToken = (value: string) => { token = value; value ? localStorage.setItem('icart_cashier_token', value) : localStorage.removeItem('icart_cashier_token'); };
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body;
}
export const cashierApi = {
  login: (email: string, password: string) => request('/cashier/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  requestPasswordReset: (email: string) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email, role: 'cashier' }) }),
  resetPassword: (email: string, code: string, newPassword: string) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, role: 'cashier', code, newPassword }) }),
  waiting: () => request('/cashier/carts/waiting'),
  cart: (id: string) => request(`/cashier/carts/${encodeURIComponent(id)}`),
  pay: (id: string, amountReceived: number) => request(`/cashier/transactions/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ paymentMethod: 'CASH', amountReceived }) }),
  transactions: () => request('/cashier/transactions'),
  transaction: (id: string) => request(`/cashier/transactions/${encodeURIComponent(id)}`),
};
