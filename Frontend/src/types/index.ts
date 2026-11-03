export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  expectedWeightGrams: number;
  stock: number;
  minimumStock: number;
  description?: string;
  aisleLocation?: string;
  image?: string;
  expirationDate?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type BudgetState = 'NORMAL' | 'WARNING' | 'EXCEEDED';

export type VerificationStatus = 'WAITING' | 'VERIFYING' | 'VERIFIED' | 'FAILED';

export type RemovalStatus =
  | 'WAITING_FOR_REMOVAL'
  | 'VERIFYING_REMOVAL'
  | 'REMOVED'
  | 'REMOVAL_FAILED'
  | 'REMOVAL_MISMATCH';

export type CartStatus = 'ACTIVE' | 'CHECKOUT_READY' | 'PAYMENT_PENDING' | 'COMPLETED' | 'CANCELLED';

export type UserMode = 'CUSTOMER' | 'ADMIN';

export type CustomerScreen =
  | 'WELCOME'
  | 'BUDGET_SETUP'
  | 'SHOPPING_HOME'
  | 'PRODUCT_VERIFICATION'
  | 'CART'
  | 'BUDGET'
  | 'REMOVE_ITEM'
  | 'CHECKOUT_REVIEW'
  | 'QR_PAYMENT'
  | 'TRANSACTION_COMPLETE'
  | 'HELP'
  | 'SEARCH_PRODUCTS';

export type AdminScreen =
  | 'LOGIN'
  | 'DASHBOARD'
  | 'PRODUCTS'
  | 'INVENTORY'
  | 'TRANSACTIONS'
  | 'REPORTS'
  | 'CART_MONITORING'
  | 'SETTINGS';

export interface StoreSettings {
  storeName: string;
  storeLogo: string;
  currency: string;
  currencySymbol: string;
  budgetWarningThreshold: number;
  weightToleranceGrams: number;
  voiceEnabled: boolean;
  theme: 'DARK' | 'LIGHT';
}

export interface TransactionRecord {
  id: string;
  cartId: string;
  date: string;
  items: CartItem[];
  total: number;
  paymentStatus: 'PAID' | 'PENDING' | 'CANCELLED' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  cashierName?: string;
  subtotal?: number;
  discount?: number;
  paymentMethod?: string;
  amountReceived?: number;
  change?: number;
  invoiceNumber?: string;
  paymentReference?: string;
  paymentProvider?: string;
  paidAt?: string;
}

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REVIEW_REQUIRED';

export interface PaymentIntent {
  paymentId: string;
  cartId: string;
  provider: string;
  providerMode: 'mock' | 'live';
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  qrImage: string;
  paidAt?: string;
  transactionId?: string;
  invoiceNumber?: string;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonitoredCart {
  cartId: string;
  status: 'SHOPPING' | 'PAYMENT PENDING' | 'IDLE' | 'COMPLETED';
  currentTotal: number;
  connectionStatus: 'ONLINE' | 'OFFLINE';
  itemCount: number;
  lastActive: string;
}
