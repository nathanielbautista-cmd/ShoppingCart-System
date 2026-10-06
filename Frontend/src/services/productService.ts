import api from './api';

export const getProducts = async (query?: string) => {
  const q = query ? `?keyword=${encodeURIComponent(query)}` : '';
  return api.get(`/products${q}`);
};

export const getProductByBarcode = async (barcode: string) => {
  return api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
};

export const createProduct = async (product: Record<string, unknown>) => api.post('/products', product);
export const updateProduct = async (id: string, product: Record<string, unknown>) =>
  api.put(`/products/${encodeURIComponent(id)}`, product);
export const removeProduct = async (id: string) => api.del(`/products/${encodeURIComponent(id)}`);
