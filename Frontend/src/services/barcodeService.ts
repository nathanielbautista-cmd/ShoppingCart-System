import { Product } from '../types';












export interface BarcodeScanResult {
  success: boolean;
  barcode: string;
  product?: Product;
  errorMessage?: string;
}





export function handleBarcodeDetected(
  barcode: string,
  productCatalog: Product[]
): BarcodeScanResult {
  const cleanBarcode = barcode.trim();

  if (!cleanBarcode) {
    return {
      success: false,
      barcode: '',
      errorMessage: 'Empty barcode received.',
    };
  }

  const matchedProduct = productCatalog.find(
    (p) => p.barcode === cleanBarcode || p.id === cleanBarcode
  );

  if (matchedProduct) {
    return {
      success: true,
      barcode: cleanBarcode,
      product: matchedProduct,
    };
  }

  return {
    success: false,
    barcode: cleanBarcode,
    errorMessage: 'Product not found. Please ask a staff member for assistance.',
  };
}
