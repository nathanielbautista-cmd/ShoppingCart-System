import { Product } from '../types';

export const BARCODE_CAPTURED_EVENT = 'icart-barcode-captured';
export const PRODUCT_SCANNED_EVENT = 'icart-product-scanned';

export interface ScannedProductEventDetail {
  product: Product;
  requiresAddConfirmation: boolean;
}

export const announceCapturedBarcode = (barcode: string) => {
  window.dispatchEvent(new CustomEvent<string>(BARCODE_CAPTURED_EVENT, { detail: barcode }));
};

export const announceScannedProduct = (product: Product, requiresAddConfirmation = false) => {
  window.dispatchEvent(new CustomEvent<ScannedProductEventDetail>(PRODUCT_SCANNED_EVENT, {
    detail: { product, requiresAddConfirmation },
  }));
};
