import api, { API_BASE, getAuthToken, setAuthToken } from './api';

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

export const requestPasswordReset = async (email: string) =>
  api.post('/auth/forgot-password', { email, role: 'admin' });

export const resetAccountPassword = async (
  email: string,
  code: string,
  newPassword: string
) => api.post('/auth/reset-password', { email, role: 'admin', code, newPassword });

export const changeAdminPassword = async (currentPassword: string, newPassword: string) =>
  api.put('/auth/change-password', { currentPassword, newPassword });

export const updateAdminProfileImage = async (profileImage: string) =>
  api.put('/auth/profile-image', { profileImage });

export const logoutAdmin = () => setAuthToken(null);

export const getInventory = async () => api.get('/inventory');
export const adjustStock = async (productId: string, action: 'add' | 'subtract' | 'set', quantity: number) =>
  api.put(`/inventory/${encodeURIComponent(productId)}/stock`, { action, quantity, reason: 'Admin dashboard adjustment' });
export const getTransactions = async () => api.get('/checkout/transactions?limit=100');
export const getDashboardOverview = async (salesPeriod: 'weekly' | 'monthly' = 'weekly') =>
  api.get(`/reports/dashboard?salesPeriod=${salesPeriod}`);

export interface DashboardUpdateEvent {
  id: string;
  reason: string;
  details: Record<string, unknown>;
  occurredAt: string;
}

export const subscribeToDashboardEvents = (
  onUpdate: (event: DashboardUpdateEvent) => void,
  onConnectionChange?: (connected: boolean) => void
) => {
  let stopped = false;
  let attempt = 0;
  let reconnectTimer: number | undefined;
  let controller: AbortController | null = null;

  const scheduleReconnect = () => {
    if (stopped) return;
    const delay = Math.min(1000 * (2 ** attempt), 15_000);
    attempt += 1;
    reconnectTimer = window.setTimeout(() => void connect(), delay);
  };

  const dispatchEvent = (block: string) => {
    let eventName = 'message';
    const data: string[] = [];

    block.split('\n').forEach((line) => {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    });

    if (eventName !== 'dashboard-update' || data.length === 0) return;
    try {
      onUpdate(JSON.parse(data.join('\n')) as DashboardUpdateEvent);
    } catch {
      // Ignore malformed events and keep the live stream connected.
    }
  };

  const connect = async () => {
    if (stopped) return;
    const token = getAuthToken();
    if (!token) {
      onConnectionChange?.(false);
      scheduleReconnect();
      return;
    }

    controller = new AbortController();
    try {
      const response = await fetch(`${API_BASE}/reports/dashboard/events`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Dashboard event stream failed (${response.status})`);
      }

      attempt = 0;
      onConnectionChange?.(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          dispatchEvent(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (!stopped && !(error instanceof DOMException && error.name === 'AbortError')) {
        // Reconnection below handles temporary backend or network failures.
      }
    } finally {
      controller = null;
      onConnectionChange?.(false);
      scheduleReconnect();
    }
  };

  void connect();

  return () => {
    stopped = true;
    controller?.abort();
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
  };
};

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
