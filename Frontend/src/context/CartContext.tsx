import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  Product,
  CartItem,
  BudgetState,
  VerificationStatus,
  RemovalStatus,
  CartStatus,
  UserMode,
  CustomerScreen,
  AdminScreen,
  StoreSettings,
  TransactionRecord,
  MonitoredCart,
} from '../types';
import { INITIAL_CARTS } from '../data/mockCarts';
import { getProducts, createProduct, updateProduct, removeProduct } from '../services/productService';
import {
  createCart,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  updateBudget,
  checkoutCart,
  requestCashierCheckout,
} from '../services/cartApi';
import { handleBarcodeDetected } from '../services/barcodeService';
import { verifyProductWeight } from '../services/sensorService';
import { speakMessage } from '../services/voiceService';
import { syncCartToBackend } from '../services/cartService';
import { AdminUser } from '../services/authService';
import { loginAdmin as authenticateAdmin, logoutAdmin as clearAdminSession, adjustStock, getTransactions } from '../services/adminService';
import { soundService } from '../services/soundService';

interface CartContextType {
  // Mode & Navigation
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  customerScreen: CustomerScreen;
  setCustomerScreen: (screen: CustomerScreen) => void;
  selectedProductCategory: string;
  setSelectedProductCategory: (category: string) => void;
  hasSetBudget: boolean;
  adminScreen: AdminScreen;
  setAdminScreen: (screen: AdminScreen) => void;

  // Cart & Budget State
  cartId: string;
  sessionError: string | null;
  cartStatus: CartStatus;
  budget: number;
  cartItems: CartItem[];
  currentTotal: number;
  remainingBudget: number;
  budgetState: BudgetState;
  budgetProgressPercent: number;

  // Verification & Scanning
  pendingProduct: Product | null;
  verificationStatus: VerificationStatus;
  detectedWeight: number | null;
  scanError: string | null;

  // Removal state
  itemToRemove: CartItem | null;
  removalStatus: RemovalStatus;

  // Settings & Voice
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  toggleVoice: () => void;
  playVoice: (message: string) => void;
  adminUser: AdminUser | null;

  // Data collections (Admin & Store)
  products: Product[];
  transactions: TransactionRecord[];
  monitoredCarts: MonitoredCart[];

  // Action Handlers
  startShoppingSession: () => void;
  applyBudget: (budgetAmount: number) => void;
  handleBarcodeScan: (barcode: string) => { success: boolean; product?: Product; error?: string };
  setPendingProduct: (product: Product | null) => void;
  startProductVerification: (product: Product, simulateFailure?: boolean) => Promise<boolean>;
  confirmPendingProduct: () => Promise<boolean>;
  retryVerification: () => Promise<boolean>;
  cancelVerification: () => void;
  updateItemQuantity: (productId: string, delta: number) => void;
  promptRemoveItem: (item: CartItem, quantityToRemove?: number) => void;
  cancelItemRemoval: () => void;
  startItemRemovalVerification: (skipWeightCheck?: boolean) => Promise<boolean>;
  confirmCheckout: () => void;
  markCashierComplete: () => Promise<boolean>;
  resetShoppingSession: () => void;

  // Admin Actions
  loginAdmin: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  adjustInventory: (productId: string, amount: number) => Promise<void>;
  simulateCashierCompleteForCart: (cartId: string, amountReceived: number) => Promise<boolean>;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Metro Supermarket',
  currency: 'PHP',
  currencySymbol: '₱',
  budgetWarningThreshold: 80, // % of budget
  weightToleranceGrams: 20, // ±20g tolerance
  voiceEnabled: true,
  theme: 'LIGHT',
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode & Navigation
  const [userMode, setUserMode] = useState<UserMode>('CUSTOMER');
  const [customerScreen, setCustomerScreenState] = useState<CustomerScreen>('WELCOME');
  const [selectedProductCategory, setSelectedProductCategory] = useState('All');
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('LOGIN');

  // Cart Core State
  const [cartId, setCartId] = useState<string>('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [cartStatus, setCartStatus] = useState<CartStatus>('ACTIVE');
  const [budget, setBudget] = useState<number>(500);
  const [hasSetBudget, setHasSetBudget] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // A shopping session cannot leave budget setup until the shopper confirms a budget.
  // This central guard also prevents navigation from bypassing the header controls.
  const setCustomerScreen = useCallback((screen: CustomerScreen) => {
    if (
      customerScreen === 'BUDGET_SETUP' &&
      !hasSetBudget &&
      screen !== 'BUDGET_SETUP' &&
      screen !== 'WELCOME'
    ) {
      return;
    }
    setCustomerScreenState(screen);
  }, [customerScreen, hasSetBudget]);

  // Verification & Scanner States
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('WAITING');
  const [detectedWeight, setDetectedWeight] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Removal state
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  const [removalStatus, setRemovalStatus] = useState<RemovalStatus>('WAITING_FOR_REMOVAL');

  // Settings & Voice
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [monitoredCarts, setMonitoredCarts] = useState<MonitoredCart[]>(INITIAL_CARTS);

  // Financial Computations
  const currentTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const remainingBudget = useMemo(() => {
    return budget - currentTotal;
  }, [budget, currentTotal]);

  const budgetProgressPercent = useMemo(() => {
    if (budget <= 0) return 0;
    return Math.min(100, Math.round((currentTotal / budget) * 100));
  }, [budget, currentTotal]);

  const budgetState: BudgetState = useMemo(() => {
    if (currentTotal > budget) return 'EXCEEDED';
    if (budget > 0 && (currentTotal / budget) * 100 >= settings.budgetWarningThreshold) {
      return 'WARNING';
    }
    return 'NORMAL';
  }, [currentTotal, budget, settings.budgetWarningThreshold]);

  // Voice Helper
  const playVoice = useCallback(
    (message: string) => {
      speakMessage(message, settings.voiceEnabled);
    },
    [settings.voiceEnabled]
  );

  const toggleVoice = useCallback(() => {
    setSettings((prev) => {
      const updated = !prev.voiceEnabled;
      if (updated) {
        speakMessage('Voice assistance activated', true);
      }
      return { ...prev, voiceEnabled: updated };
    });
  }, []);

  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Sync state whenever cartItems or status changes
  useEffect(() => {
    syncCartToBackend({
      cartId,
      cartItems,
      totalAmount: currentTotal,
      budget,
      status: cartStatus,
      updatedAt: new Date().toISOString(),
    });
  }, [cartId, cartItems, currentTotal, budget, cartStatus]);

  // Load products from backend on mount
  useEffect(() => {
    let mounted = true;
    getProducts()
      .then((res) => {
        if (!mounted) return;
        if (res && res.products) {
          const mapped = res.products.map((p: any) => ({
            id: p._id,
            barcode: p.barcode,
            name: p.name,
            category: p.category,
            price: p.price,
            expectedWeightGrams: p.weight || 0,
            stock: p.stock || 0,
            minimumStock: 0,
            description: p.description || '',
            aisleLocation: '',
            image: p.image || '',
          }));
          setProducts(mapped);
        }
      })
      .catch((err) => console.error('Failed to load products from backend', err));
    return () => {
      mounted = false;
    };
  }, []);

  // Navigation & Flow Actions
  const startShoppingSession = useCallback(() => {
    // create cart on backend and store cartId
    setSessionError(null);
    createCart()
      .then((res: any) => {
        if (res && res.cart) {
          setCartId(res.cart.cartId || res.cart._id || '');
          setCartItems([]);
          setHasSetBudget(false);
          setCartStatus('ACTIVE');
          setCustomerScreenState('BUDGET_SETUP');
          playVoice('Welcome to iCart. Please set your shopping budget.');
        } else {
          setSessionError('The server did not return a new cart. Please try again or contact staff.');
          playVoice('Unable to start shopping session. Please ask a staff member for assistance.');
        }
      })
      .catch((err) => {
        console.error('Failed to create cart on backend', err);
        const message = err instanceof Error ? err.message : 'Unable to reach the iCart backend.';
        setSessionError(`Could not start session: ${message}`);
        playVoice('Unable to start shopping session. Please ask a staff member for assistance.');
      });
  }, [playVoice]);

  const applyBudget = useCallback(
    (budgetAmount: number) => {
      setBudget(budgetAmount);
      setHasSetBudget(true);
      if (cartId) {
        updateBudget(cartId, { budget: budgetAmount })
          .then((res: any) => {
            if (res && (res.budget !== undefined)) {
              setBudget(res.budget);
            }
            setCustomerScreenState('SHOPPING_HOME');
            playVoice(`Budget set to ${settings.currencySymbol}${budgetAmount}. You are ready to shop.`);
          })
          .catch((err) => {
            console.error('Failed to update budget', err);
            setCustomerScreenState('SHOPPING_HOME');
          });
      } else {
        setCustomerScreenState('SHOPPING_HOME');
        playVoice(`Budget set to ${settings.currencySymbol}${budgetAmount}. You are ready to shop.`);
      }
    },
    [playVoice, settings.currencySymbol]
  );

  // Barcode Detection
  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      setScanError(null);
      const res = handleBarcodeDetected(barcode, products);
      if (res.success && res.product) {
        soundService.playScanBeep();
        setPendingProduct(res.product);
        playVoice(`Scanned ${res.product.name}. Price is ${settings.currencySymbol}${res.product.price}.`);
        return { success: true, product: res.product };
      } else {
        soundService.playWarning();
        const errorMsg = res.errorMessage || 'Product not found. Please ask a staff member for assistance.';
        setScanError(errorMsg);
        playVoice(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [products, playVoice, settings.currencySymbol]
  );

  // Weight Verification after scanning
  const startProductVerification = useCallback(
    async (product: Product, simulateFailure: boolean = false) => {
      setPendingProduct(product);
      setCustomerScreen('PRODUCT_VERIFICATION');
      setVerificationStatus('WAITING');
      setDetectedWeight(null);
      playVoice('Please place the item inside the cart.');

      // Transition to VERIFYING
      await new Promise((r) => setTimeout(r, 600));
      setVerificationStatus('VERIFYING');

      // Call sensorService placeholder
      const result = await verifyProductWeight(
        product.expectedWeightGrams,
        settings.weightToleranceGrams,
        simulateFailure
      );

      setDetectedWeight(result.detectedWeightGrams);

      if (result.verified) {
        soundService.playSuccessChime();
        setVerificationStatus('VERIFIED');
        // Add to backend cart if available, otherwise local fallback
        if (cartId) {
          addCartItem(cartId, { barcode: product.barcode, quantity: 1 })
            .then((res: any) => {
              if (res && res.cart) {
                const formatted = res.cart.items.map((i: any) => ({ product: {
                      id: i.productId,
                      barcode: i.barcode,
                      name: i.name,
                      category: i.category || '',
                      price: i.price,
                      expectedWeightGrams: i.quantity ? i.expectedWeight / i.quantity : 0,
                      stock: i.stock || 0,
                      minimumStock: 0,
                    }, quantity: i.quantity }));
                setCartItems(formatted);
                setCartStatus(res.cart.status || 'ACTIVE');
              }
            })
            .catch((err) => console.error('Add cart item failed', err));
        } else {
          setCartItems((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
              return prev.map((item) =>
                item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              );
            }
            return [...prev, { product, quantity: 1 }];
          });
        }
        playVoice(`${product.name} verified and added to cart.`);
        return true;
      } else {
        soundService.playWarning();
        setVerificationStatus('FAILED');
        playVoice('Weight verification failed. Please place only the scanned item into the cart.');
        return false;
      }
    },
    [cartId, settings.weightToleranceGrams, playVoice]
  );

  const retryVerification = useCallback(async () => {
    if (!pendingProduct) return false;
    return startProductVerification(pendingProduct, false);
  }, [pendingProduct, startProductVerification]);

  // Physical ADD button: intentionally bypasses the scale only after a product
  // has already been scanned and is awaiting confirmation.
  const confirmPendingProduct = useCallback(async () => {
    if (!pendingProduct) return false;
    const product = pendingProduct;
    try {
      if (cartId) {
        const res: any = await addCartItem(cartId, { barcode: product.barcode, quantity: 1 });
        if (res?.cart) {
          setCartItems(res.cart.items.map((i: any) => ({ product: {
            id: i.productId, barcode: i.barcode, name: i.name, category: i.category || '',
            price: i.price, expectedWeightGrams: i.quantity ? i.expectedWeight / i.quantity : 0,
            stock: i.stock || 0, minimumStock: 0,
          }, quantity: i.quantity })));
        }
      } else {
        setCartItems((prev) => {
          const existing = prev.find((item) => item.product.id === product.id);
          return existing
            ? prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
            : [...prev, { product, quantity: 1 }];
        });
      }
      setVerificationStatus('VERIFIED');
      setPendingProduct(null);
      soundService.playSuccessChime();
      playVoice(`${product.name} added to cart.`);
      return true;
    } catch (err) {
      console.error('Physical add failed', err);
      setVerificationStatus('FAILED');
      playVoice('Item could not be added to the cart.');
      return false;
    }
  }, [cartId, pendingProduct, playVoice]);

  const cancelVerification = useCallback(() => {
    setPendingProduct(null);
    setVerificationStatus('WAITING');
    setDetectedWeight(null);
    setCustomerScreen('SHOPPING_HOME');
    playVoice('Scan cancelled.');
  }, [playVoice]);

  // Quantity modification
  const updateItemQuantity = useCallback(
    (productId: string, delta: number) => {
      const item = cartItems.find((i) => i.product.id === productId);
      if (!item) return;

      if (delta > 0) {
        // Do not update the quantity until the newly placed item passes the scale check.
        void startProductVerification(item.product);
        return;
      }

      // Remove exactly one unit only after its weight reduction is verified.
      promptRemoveItem(item, 1);
    },
    [cartItems, startProductVerification]
  );

  // Item Removal Flow
  const promptRemoveItem = useCallback(
    (item: CartItem, quantityToRemove: number = item.quantity) => {
      setItemToRemove({ ...item, quantity: Math.min(quantityToRemove, item.quantity) });
      setRemovalStatus('WAITING_FOR_REMOVAL');
      setCustomerScreen('REMOVE_ITEM');
      playVoice(`Remove ${item.product.name}? Please remove the item from the cart.`);
    },
    [playVoice]
  );

  const cancelItemRemoval = useCallback(() => {
    setItemToRemove(null);
    setCustomerScreen('CART');
  }, []);

  const startItemRemovalVerification = useCallback(async (skipWeightCheck: boolean = false) => {
    if (!itemToRemove) return false;
    setRemovalStatus('VERIFYING_REMOVAL');
    playVoice('Verifying item removal from cart...');

    if (!skipWeightCheck) {
      const weightCheck = await verifyProductWeight(
        itemToRemove.product.expectedWeightGrams * itemToRemove.quantity,
        settings.weightToleranceGrams
      );

      if (!weightCheck.verified) {
        soundService.playWarning();
        setRemovalStatus('REMOVAL_FAILED');
        playVoice('Weight verification failed. Please remove the selected item from the cart and try again.');
        return false;
      }
    }

    try {
      // The cart API identifies an item by its cart-item ID or barcode, not its product ID.
      if (cartId) {
        const currentItem = cartItems.find((item) => item.product.id === itemToRemove.product.id);
        if (!currentItem) throw new Error('Item is no longer in the cart');

        const res: any = itemToRemove.quantity >= currentItem.quantity
          ? await removeCartItem(cartId, itemToRemove.product.barcode)
          : await updateCartItem(cartId, itemToRemove.product.barcode, {
              quantity: currentItem.quantity - itemToRemove.quantity,
            });
        if (res?.cart) {
          const formatted = res.cart.items.map((i: any) => ({ product: {
            id: i.productId,
            barcode: i.barcode,
            name: i.name,
            category: i.category || '',
            price: i.price,
            expectedWeightGrams: i.quantity ? i.expectedWeight / i.quantity : 0,
            stock: i.stock || 0,
            minimumStock: 0,
          }, quantity: i.quantity }));
          setCartItems(formatted);
        }
      } else {
        setCartItems((prev) => prev.flatMap((item) => {
          if (item.product.id !== itemToRemove.product.id) return [item];
          const quantity = item.quantity - itemToRemove.quantity;
          return quantity > 0 ? [{ ...item, quantity }] : [];
        }));
      }
    } catch (err) {
      console.error('Remove cart item failed', err);
      setRemovalStatus('REMOVAL_FAILED');
      playVoice('Item could not be removed from the cart. Please try again.');
      return false;
    }

    setRemovalStatus('REMOVED');
    soundService.playSuccessChime();
    playVoice(`${itemToRemove.product.name} has been removed from your cart.`);

    // Delay briefly so user sees the "REMOVED" state
    setTimeout(() => {
      setItemToRemove(null);
      setCustomerScreen('CART');
    }, 1000);

    return true;
  }, [cartId, cartItems, itemToRemove, playVoice, settings.weightToleranceGrams]);

  // Checkout Flow
  const confirmCheckout = useCallback(() => {
    if (!cartId) {
      playVoice('No active cart found. Please start a shopping session first.');
      return;
    }
    requestCashierCheckout(cartId)
      .then((res: any) => {
        setCartStatus(res?.cart?.status || 'WAITING_FOR_CASHIER');
        setCustomerScreen('WAITING_FOR_CASHIER');
        playVoice('Checkout confirmed. Please proceed to any available cashier counter.');
      })
      .catch((err) => {
        console.error('Checkout failed', err);
        playVoice('Checkout failed. Please ask a staff member for assistance.');
      });
  }, [cartId, playVoice]);

  const markCashierComplete = useCallback(async () => {
    if (!cartId) return false;

    try {
      const res: any = await checkoutCart(cartId, {
        paymentMethod: 'CASH',
        cashierId: 'CASHIER-DESK-1',
        amountReceived: currentTotal,
      });
      const receipt = res?.receipt;
      if (receipt) {
        setTransactions((prev) => [{
          id: receipt.transactionId,
          cartId: receipt.cartId,
          date: receipt.date,
          items: receipt.items.map((item: any) => ({
            product: {
              id: String(item.productId), barcode: item.barcode, name: item.name, category: '',
              price: item.price, expectedWeightGrams: 0, stock: 0, minimumStock: 0,
            },
            quantity: item.quantity,
          })),
          total: receipt.total,
          subtotal: receipt.subtotal,
          discount: receipt.discount,
          paymentMethod: receipt.paymentMethod,
          amountReceived: receipt.amountReceived,
          change: receipt.change,
          paymentStatus: receipt.paymentStatus,
          cashierName: receipt.cashierId,
        }, ...prev]);
      }
      soundService.playSuccessChime();
      setCartStatus('COMPLETED');
      setCustomerScreen('TRANSACTION_COMPLETE');
      playVoice('Payment confirmed by cashier. Thank you for shopping with iCart!');
      return true;
    } catch (err) {
      console.error('Cashier payment failed', err);
      playVoice('Payment could not be completed. Please ask the cashier for assistance.');
      return false;
    }
  }, [cartId, cartItems, currentTotal, playVoice]);

  const resetShoppingSession = useCallback(() => {
    setCartItems([]);
    setPendingProduct(null);
    setItemToRemove(null);
    setHasSetBudget(false);
    setCartStatus('ACTIVE');
    setCustomerScreenState('WELCOME');
  }, []);

  // Admin Actions
  const loginAdmin = useCallback(async (email: string, pass: string) => {
    try {
      const res = await authenticateAdmin(email, pass);
      setAdminUser({ username: res.user.email, name: res.user.name, role: 'ADMIN' });
      setUserMode('ADMIN');
      setAdminScreen('DASHBOARD');

      const [productRes, transactionRes] = await Promise.all([getProducts(), getTransactions()]);
      if (productRes.products) {
        setProducts(productRes.products.map((p: any) => ({
          id: p._id, barcode: p.barcode, name: p.name, category: p.category, price: p.price,
          expectedWeightGrams: p.weight || 0, stock: p.stock || 0, minimumStock: 5,
          description: p.description || '', aisleLocation: '', image: p.image || ''
        })));
      }
      if (transactionRes.transactions) {
        setTransactions(transactionRes.transactions.map((tx: any) => ({
          id: tx.transactionId, cartId: tx.cartId, date: tx.createdAt, total: tx.total,
          subtotal: tx.subtotal, discount: tx.discount, paymentMethod: tx.paymentMethod,
          amountReceived: tx.amountReceived, change: tx.change,
          paymentStatus: tx.paymentStatus, cashierName: tx.cashierId,
          items: tx.items.map((item: any) => ({
            product: { id: String(item.productId), barcode: item.barcode, name: item.name, category: '',
              price: item.price, expectedWeightGrams: 0, stock: 0, minimumStock: 5 }, quantity: item.quantity
          }))
        })));
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      return { success: false, error: message };
    }
  }, []);

  const logoutAdmin = useCallback(() => {
    clearAdminSession();
    setAdminUser(null);
    setUserMode('CUSTOMER');
    setCustomerScreen('WELCOME');
  }, []);

  const saveProduct = useCallback(async (product: Product) => {
    const payload = {
      barcode: product.barcode, name: product.name, category: product.category,
      description: product.description || '', price: product.price, stock: product.stock,
      weight: product.expectedWeightGrams, image: product.image || '', unit: 'piece', isActive: true,
    };
    const res: any = product.id.startsWith('prod-')
      ? await createProduct(payload)
      : await updateProduct(product.id, payload);
    const stored = res.product;
    const normalized: Product = { ...product, id: stored._id, stock: stored.stock, expectedWeightGrams: stored.weight };
    setProducts((prev) => product.id.startsWith('prod-')
      ? [...prev, normalized]
      : prev.map((item) => item.id === product.id ? normalized : item));
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    await removeProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const adjustInventory = useCallback(async (productId: string, amount: number) => {
    const res: any = await adjustStock(productId, 'add', amount);
    setProducts((prev) => prev.map((product) => product.id === productId
      ? { ...product, stock: res.product.currentStock }
      : product));
  }, []);

  const simulateCashierCompleteForCart = useCallback(
    async (targetCartId: string, amountReceived: number) => {
      if (targetCartId === cartId) {
        return markCashierComplete();
      } else {
        try {
          await checkoutCart(targetCartId, {
            paymentMethod: 'CASH',
            cashierId: 'CASHIER-DESK-1',
            amountReceived,
          });
          setMonitoredCarts((prev) =>
            prev.map((c) => (c.cartId === targetCartId ? { ...c, status: 'COMPLETED' } : c))
          );
          return true;
        } catch (err) {
          console.error('Cashier payment failed', err);
          return false;
        }
      }
    },
    [cartId, markCashierComplete]
  );

  return (
    <CartContext.Provider
      value={{
        userMode,
        setUserMode,
        customerScreen,
        setCustomerScreen,
        selectedProductCategory,
        setSelectedProductCategory,
        hasSetBudget,
        adminScreen,
        setAdminScreen,
        cartId,
        sessionError,
        cartStatus,
        budget,
        cartItems,
        currentTotal,
        remainingBudget,
        budgetState,
        budgetProgressPercent,
        pendingProduct,
        verificationStatus,
        detectedWeight,
        scanError,
        itemToRemove,
        removalStatus,
        settings,
        updateSettings,
        toggleVoice,
        playVoice,
        adminUser,
        products,
        transactions,
        monitoredCarts,
        startShoppingSession,
        applyBudget,
        handleBarcodeScan,
        setPendingProduct,
        startProductVerification,
        confirmPendingProduct,
        retryVerification,
        cancelVerification,
        updateItemQuantity,
        promptRemoveItem,
        cancelItemRemoval,
        startItemRemovalVerification,
        confirmCheckout,
        markCashierComplete,
        resetShoppingSession,
        loginAdmin,
        logoutAdmin,
        saveProduct,
        deleteProduct,
        adjustInventory,
        simulateCashierCompleteForCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
