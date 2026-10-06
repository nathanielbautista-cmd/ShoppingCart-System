import api from './api';

export const getProducts = async (query?: string) => {
  const q = query ? `?keyword=${encodeURIComponent(query)}` : '';
  return api.get(`/products${q}`);
};

export const getProductByBarcode = async (barcode: string) => {
  return api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
};
