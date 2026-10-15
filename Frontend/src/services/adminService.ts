import api, { setAuthToken } from './api';

export const loginAdmin = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  setAuthToken(response.token);
  return response;
};

export interface AdminRegistration {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export const registerAdmin = async (details: AdminRegistration) =>
  api.post('/auth/register', details);

export const verifyAdminEmail = async (email: string, code: string) =>
  api.post('/auth/verify-email', { email, code });

export const resendAdminVerification = async (email: string) =>
  api.post('/auth/resend-verification', { email });

export const requestPasswordReset = async (email: string, role: 'admin' | 'cashier') =>
  api.post('/auth/forgot-password', { email, role });

export const resetAccountPassword = async (
  email: string,
  role: 'admin' | 'cashier',
  code: string,
  newPassword: string
) => api.post('/auth/reset-password', { email, role, code, newPassword });

export const changeAdminPassword = async (currentPassword: string, newPassword: string) =>
  api.put('/auth/change-password', { currentPassword, newPassword });

export interface CashierAccount {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'cashier';
  createdAt: string;
  updatedAt: string;
}

export interface CashierRegistration {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export const getCashierAccounts = async () => api.get('/admin/cashiers');
export const createCashierAccount = async (details: CashierRegistration) =>
  api.post('/admin/cashiers', details);

export const logoutAdmin = () => setAuthToken(null);

export const getInventory = async () => api.get('/inventory');
export const adjustStock = async (productId: string, action: 'add' | 'subtract' | 'set', quantity: number) =>
  api.put(`/inventory/${encodeURIComponent(productId)}/stock`, { action, quantity, reason: 'Admin dashboard adjustment' });
export const getTransactions = async () => api.get('/checkout/transactions?limit=100');
export const getDashboardOverview = async (salesPeriod: 'weekly' | 'monthly' = 'weekly') =>
  api.get(`/reports/dashboard?salesPeriod=${salesPeriod}`);

export interface ProductPerformanceParams {
  from: string;
  to: string;
}

export const getProductPerformance = async (filters: ProductPerformanceParams) => {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  });
  return api.get(`/reports/product-performance?${params.toString()}`);
};
