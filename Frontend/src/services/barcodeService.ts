import { Product } from '../types';

/**
 * Barcode Service for iCart
 *
 * HARDWARE TARGET:
 * OJ-MP6300 USB Barcode Scanner (or compatible USB HID / virtual COM barcode scanner)
 *
 * NOTE:
 * Hardware integration (USB scanner listener / serial port / keyboard emulation)
 * will be hooked into this module in the next phase.
 */

export interface BarcodeScanResult {
  success: boolean;
  barcode: string;
  product?: Product;
  errorMessage?: string;
}

/**
 * Placeholder function for processing incoming barcode strings from
 * the OJ-MP6300 scanner.
 */
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
