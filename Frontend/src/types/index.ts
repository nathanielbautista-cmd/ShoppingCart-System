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
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type BudgetState = 'NORMAL' | 'WARNING' | 'EXCEEDED';

export type VerificationStatus = 'WAITING' | 'VERIFYING' | 'VERIFIED' | 'FAILED';

export type RemovalStatus = 'WAITING_FOR_REMOVAL' | 'VERIFYING_REMOVAL' | 'REMOVED' | 'REMOVAL_FAILED';

export type CartStatus = 'ACTIVE' | 'CHECKOUT_READY' | 'WAITING_FOR_CASHIER' | 'COMPLETED' | 'CANCELLED';

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
  | 'WAITING_FOR_CASHIER'
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
  | 'CASHIERS'
  | 'SETTINGS';

export interface StoreSettings {
  storeName: string;
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
  paymentStatus: 'PAID' | 'PENDING' | 'CANCELLED';
  cashierName?: string;
  subtotal?: number;
  discount?: number;
  paymentMethod?: string;
  amountReceived?: number;
  change?: number;
}

export interface MonitoredCart {
  cartId: string;
  status: 'SHOPPING' | 'WAITING FOR CASHIER' | 'IDLE' | 'COMPLETED';
  currentTotal: number;
  connectionStatus: 'ONLINE' | 'OFFLINE';
  itemCount: number;
  lastActive: string;
}
