const BASE = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'icart_admin_token';

export const setAuthToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

async function request(path: string, opts: RequestInit = {}) {
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch (e) {}
  if (!res.ok) {
    const err = new Error(body && body.message ? body.message : res.statusText);
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return body;
}

export default {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, data?: any) => request(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: (path: string, data?: any) => request(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  del: (path: string) => request(path, { method: 'DELETE' }),
};
