import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  getCartTransactions,
  reportWeightAnomaly,
  clearWeightAnomaly,
} from '../services/cartApi';
import { handleBarcodeDetected } from '../services/barcodeService';
import { getCurrentWeight, verifyProductWeight, waitForWeightDecrease } from '../services/sensorService';
import { speakMessage } from '../services/voiceService';
import { syncCartToBackend } from '../services/cartService';
import { AdminUser } from '../services/authService';
import { loginAdmin as authenticateAdmin, logoutAdmin as clearAdminSession, adjustStock, getTransactions } from '../services/adminService';
import { soundService } from '../services/soundService';

interface CartContextType {

  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  customerScreen: CustomerScreen;
  setCustomerScreen: (screen: CustomerScreen) => void;
  selectedProductCategory: string;
  setSelectedProductCategory: (category: string) => void;
  hasSetBudget: boolean;
  adminScreen: AdminScreen;
  setAdminScreen: (screen: AdminScreen) => void;


  cartId: string;
  sessionError: string | null;
  cartStatus: CartStatus;
  checkoutSubmitting: boolean;
  checkoutError: string | null;
  budget: number;
  cartItems: CartItem[];
  currentTotal: number;
  remainingBudget: number;
  budgetState: BudgetState;
  budgetProgressPercent: number;


  pendingProduct: Product | null;
  verificationStatus: VerificationStatus;
  detectedWeight: number | null;
  scanError: string | null;


  itemToRemove: CartItem | null;
  removalStatus: RemovalStatus;
  weightAnomaly: { changeGrams: number; direction: 'increase' | 'decrease' } | null;


  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  toggleVoice: () => void;
  playVoice: (message: string) => void;
  adminUser: AdminUser | null;


  products: Product[];
  transactions: TransactionRecord[];
  monitoredCarts: MonitoredCart[];


  startShoppingSession: () => void;
  applyBudget: (budgetAmount: number) => void;
  handleBarcodeScan: (barcode: string) => { success: boolean; product?: Product; error?: string };
  setPendingProduct: (product: Product | null) => void;
  startProductVerification: (product: Product, simulateFailure?: boolean, simulateSuccess?: boolean) => Promise<boolean>;
  confirmPendingProduct: () => Promise<boolean>;
  retryVerification: () => Promise<boolean>;
  cancelVerification: () => void;
  updateItemQuantity: (productId: string, delta: number) => void;
  promptRemoveItem: (item: CartItem, quantityToRemove?: number) => void;
  cancelItemRemoval: () => void;
  startItemRemovalVerification: (simulateSuccess?: boolean) => Promise<boolean>;
  confirmCheckout: () => void;
  markCashierComplete: (simulateSuccess?: boolean) => Promise<boolean>;
  resetShoppingSession: () => void;


  loginAdmin: (username: string, pass: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
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
  budgetWarningThreshold: 80,
  weightToleranceGrams: 20,
  voiceEnabled: true,
  theme: 'LIGHT',
};

const SETTINGS_STORAGE_KEY = 'icart_store_settings';

const loadStoredSettings = (): StoreSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<StoreSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme: parsed.theme === 'DARK' ? 'DARK' : 'LIGHT',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

interface AutomaticRemovalMatch {
  item: CartItem;
  quantity: number;
  differenceGrams: number;
}

const findAutomaticRemovalMatch = (
  items: CartItem[],
  decreaseGrams: number,
  toleranceGrams: number
): AutomaticRemovalMatch | null => {
  const matches = items
    .flatMap((item) => Array.from({ length: item.quantity }, (_, index) => {
      const quantity = index + 1;
      return {
        item,
        quantity,
        differenceGrams: Math.abs(
          decreaseGrams - item.product.expectedWeightGrams * quantity
        ),
      };
    }))
    .filter((match) => match.differenceGrams <= toleranceGrams)
    .sort((first, second) => first.differenceGrams - second.differenceGrams);

  if (matches.length === 0) return null;

  // A load cell cannot distinguish two products with the same (or nearly the
  // same) weight. Refuse to guess so the wrong cart line is never deducted.
  const ambiguityMarginGrams = Math.max(2, toleranceGrams * 0.25);
  if (
    matches.length > 1 &&
    Math.abs(matches[1].differenceGrams - matches[0].differenceGrams) <= ambiguityMarginGrams
  ) {
    return null;
  }

  return matches[0];
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [userMode, setUserMode] = useState<UserMode>('CUSTOMER');
  const [customerScreen, setCustomerScreenState] = useState<CustomerScreen>('WELCOME');
  const [selectedProductCategory, setSelectedProductCategory] = useState('All');
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('LOGIN');


  const [cartId, setCartId] = useState<string>('');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [cartStatus, setCartStatus] = useState<CartStatus>('ACTIVE');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number>(0);
  const [hasSetBudget, setHasSetBudget] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);



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


  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('WAITING');
  const [detectedWeight, setDetectedWeight] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const verificationInProgressRef = useRef(false);
  const verificationAttemptRef = useRef(0);


  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  const [removalStatus, setRemovalStatus] = useState<RemovalStatus>('WAITING_FOR_REMOVAL');
  const removalInProgressRef = useRef(false);
  const removalAttemptRef = useRef(0);

  const [weightAnomaly, setWeightAnomaly] = useState<{
    changeGrams: number;
    direction: 'increase' | 'decrease';
  } | null>(null);
  const weightAnomalyRef = useRef<{
    changeGrams: number;
    direction: 'increase' | 'decrease';
  } | null>(null);
  const backgroundBaselineRef = useRef<number | null>(null);
  const backgroundBaselineSamplesRef = useRef<number[]>([]);
  const backgroundReadingTimestampRef = useRef<string | null>(null);
  const backgroundRemovalInProgressRef = useRef(false);
  const increaseCandidateRef = useRef<{ grams: number; count: number } | null>(null);
  const decreaseCandidateRef = useRef<{ grams: number; count: number } | null>(null);
  const anomalyReturnCandidateRef = useRef(0);


  const [settings, setSettings] = useState<StoreSettings>(loadStoredSettings);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);


  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [monitoredCarts, setMonitoredCarts] = useState<MonitoredCart[]>(INITIAL_CARTS);


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
      const nextSettings = { ...prev, voiceEnabled: updated };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      return nextSettings;
    });
  }, []);

  useEffect(() => {
    const monitoringAllowed = (
      userMode === 'CUSTOMER' &&
      hasSetBudget &&
      cartStatus === 'ACTIVE' &&
      (pendingProduct === null || verificationStatus === 'VERIFIED') &&
      itemToRemove === null &&
      (customerScreen !== 'PRODUCT_VERIFICATION' || verificationStatus === 'VERIFIED') &&
      customerScreen !== 'REMOVE_ITEM' &&
      customerScreen !== 'CHECKOUT_REVIEW' &&
      customerScreen !== 'WAITING_FOR_CASHIER' &&
      customerScreen !== 'TRANSACTION_COMPLETE'
    );

    if (!monitoringAllowed) {
      backgroundBaselineRef.current = null;
      backgroundBaselineSamplesRef.current = [];
      backgroundReadingTimestampRef.current = null;
      backgroundRemovalInProgressRef.current = false;
      increaseCandidateRef.current = null;
      decreaseCandidateRef.current = null;
      anomalyReturnCandidateRef.current = 0;
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;
    // React on the first newly published stable reading. Stability is already
    // calculated from three raw HX711 samples on the Pi; the 15 g floor keeps
    // ordinary empty-basket drift below the unscanned-item trigger.
    const minimumIncreaseThresholdGrams = 15;
    const baselineSampleCount = 1;
    const requiredIncreaseConfirmations = 1;

    const updateAnomaly = (value: {
      changeGrams: number;
      direction: 'increase' | 'decrease';
    } | null) => {
      weightAnomalyRef.current = value;
      setWeightAnomaly(value);
    };

    const poll = async () => {
      try {
        if (backgroundRemovalInProgressRef.current) return;
        const reading = await getCurrentWeight();
        if (cancelled) return;

        // The browser polls faster than the Raspberry Pi publishes. A repeated
        // backend sample must never count as multiple confirmations. Keep
        // unstable publications for anomaly recovery because a recently
        // moved basket may take several seconds to be labelled STABLE.
        const readingTimestamp = reading.receivedAt || reading.measuredAt;
        if (readingTimestamp && readingTimestamp === backgroundReadingTimestampRef.current) return;
        backgroundReadingTimestampRef.current = readingTimestamp;

        const baseline = backgroundBaselineRef.current;
        const activeAnomaly = weightAnomalyRef.current;
        if (activeAnomaly && baseline !== null) {
          // Use the configured product-weight tolerance, capped below half of
          // the detected anomaly. A stable return clears immediately; two
          // consecutive near-baseline raw readings also clear it so the UI is
          // not held open by a slow STABLE flag from the HX711 publisher.
          const returnToleranceGrams = Math.max(
            10,
            Math.min(settings.weightToleranceGrams, activeAnomaly.changeGrams * 0.45)
          );
          const returnedToBaseline = Math.abs(reading.grams - baseline) <= returnToleranceGrams;
          anomalyReturnCandidateRef.current = returnedToBaseline
            ? reading.stable
              ? 2
              : anomalyReturnCandidateRef.current + 1
            : 0;

          if (anomalyReturnCandidateRef.current >= 2) {
            updateAnomaly(null);
            backgroundBaselineRef.current = reading.grams;
            backgroundBaselineSamplesRef.current = [];
            increaseCandidateRef.current = null;
            decreaseCandidateRef.current = null;
            anomalyReturnCandidateRef.current = 0;
            if (cartId) void clearWeightAnomaly(cartId).catch(() => undefined);
            playVoice(activeAnomaly.direction === 'increase'
              ? 'Unscanned item removed. You may continue shopping.'
              : 'Removed item returned to the basket. Use My Cart if you want to remove it.');
          }
          return;
        }

        anomalyReturnCandidateRef.current = 0;
        if (activeAnomaly || !reading.stable) return;

        if (baseline === null) {
          const baselineSamples = backgroundBaselineSamplesRef.current;
          baselineSamples.push(reading.grams);
          if (baselineSamples.length < baselineSampleCount) return;
          const sortedSamples = [...baselineSamples].sort((first, second) => first - second);
          backgroundBaselineRef.current = sortedSamples[Math.floor(sortedSamples.length / 2)];
          backgroundBaselineSamplesRef.current = [];
          return;
        }

        // Keep the trigger above observed HX711 noise. The lightest catalog
        // products are around 30 g, so a 12-20 g threshold still detects them.
        const increaseThresholdGrams = Math.max(
          minimumIncreaseThresholdGrams,
          Math.min(20, reading.spreadGrams * 1.5)
        );
        const candidateAgreementGrams = Math.max(5, increaseThresholdGrams * 0.5);

        const delta = reading.grams - baseline;
        if (delta >= increaseThresholdGrams) {
          const candidate = increaseCandidateRef.current;
          if (candidate && Math.abs(delta - candidate.grams) <= candidateAgreementGrams) {
            candidate.grams = delta;
            candidate.count += 1;
          } else {
            increaseCandidateRef.current = { grams: delta, count: 1 };
          }
          decreaseCandidateRef.current = null;

          if ((increaseCandidateRef.current?.count || 0) >= requiredIncreaseConfirmations) {
            const increaseGrams = Number(delta.toFixed(1));
            anomalyReturnCandidateRef.current = 0;
            updateAnomaly({ changeGrams: increaseGrams, direction: 'increase' });
            soundService.playWarning();
            playVoice('Unscanned item detected. Remove it from the basket, scan its barcode, then place it back.');
            if (cartId) void reportWeightAnomaly(
              cartId,
              increaseGrams,
              `Unscanned item detected (+${increaseGrams.toFixed(1)}g)`
            ).catch(() => undefined);
          }
          return;
        }

        increaseCandidateRef.current = null;
        const decreaseThresholdGrams = Math.max(15, increaseThresholdGrams);
        if (delta <= -decreaseThresholdGrams) {
          const candidate = decreaseCandidateRef.current;
          if (candidate && Math.abs(reading.grams - candidate.grams) <= candidateAgreementGrams) {
            candidate.grams = reading.grams;
            candidate.count += 1;
          } else {
            decreaseCandidateRef.current = { grams: reading.grams, count: 1 };
          }
          if ((decreaseCandidateRef.current?.count || 0) >= 2) {
            const decreaseGrams = Number(Math.abs(delta).toFixed(1));
            decreaseCandidateRef.current = null;
            const match = findAutomaticRemovalMatch(
              cartItems,
              decreaseGrams,
              settings.weightToleranceGrams
            );

            if (!match) {
              updateAnomaly({ changeGrams: decreaseGrams, direction: 'decrease' });
              anomalyReturnCandidateRef.current = 0;
              soundService.playWarning();
              playVoice(
                'The removed weight does not uniquely match an item in your cart. ' +
                'Return it to the basket, then use My Cart to remove it.'
              );
              if (cartId) void reportWeightAnomaly(
                cartId,
                -decreaseGrams,
                `Unmatched or ambiguous item removal (-${decreaseGrams.toFixed(1)}g)`
              ).catch(() => undefined);
              return;
            }

            backgroundRemovalInProgressRef.current = true;
            try {
              if (cartId) {
                const response: any = match.quantity >= match.item.quantity
                  ? await removeCartItem(cartId, match.item.product.barcode)
                  : await updateCartItem(cartId, match.item.product.barcode, {
                      quantity: match.item.quantity - match.quantity,
                    });
                if (!response?.cart) {
                  throw new Error('The server did not return the updated cart.');
                }
                setCartItems(response.cart.items.map((item: any) => ({
                  product: {
                    id: item.productId,
                    barcode: item.barcode,
                    name: item.name,
                    category: item.category || '',
                    price: item.price,
                    expectedWeightGrams: item.quantity ? item.expectedWeight / item.quantity : 0,
                    stock: item.stock || 0,
                    minimumStock: 0,
                  },
                  quantity: item.quantity,
                })));
              } else {
                setCartItems((previousItems) => previousItems.flatMap((item) => {
                  if (item.product.id !== match.item.product.id) return [item];
                  const quantity = item.quantity - match.quantity;
                  return quantity > 0 ? [{ ...item, quantity }] : [];
                }));
              }

              backgroundBaselineRef.current = reading.grams;
              soundService.playSuccessChime();
              playVoice(
                `${match.quantity > 1 ? `${match.quantity} units of ` : ''}` +
                `${match.item.product.name} automatically removed from your cart.`
              );
            } catch (error) {
              console.error('Automatic cart removal failed', error);
              updateAnomaly({ changeGrams: decreaseGrams, direction: 'decrease' });
              soundService.playWarning();
              playVoice(
                'The item was removed from the basket but could not be updated in your cart. ' +
                'Return it to the basket and try again.'
              );
            } finally {
              backgroundRemovalInProgressRef.current = false;
            }
          }
          return;
        }

        decreaseCandidateRef.current = null;
        // Follow normal slow load-cell drift without hiding a sudden item add.
        backgroundBaselineRef.current = Number((baseline * 0.8 + reading.grams * 0.2).toFixed(1));
      } catch {
        // Scale availability is already displayed in the top bar.
      } finally {
        if (!cancelled) timerId = window.setTimeout(poll, 100);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
      increaseCandidateRef.current = null;
      decreaseCandidateRef.current = null;
      anomalyReturnCandidateRef.current = 0;
      backgroundBaselineSamplesRef.current = [];
      backgroundReadingTimestampRef.current = null;
    };
  }, [cartId, cartItems, cartStatus, customerScreen, hasSetBudget, itemToRemove, pendingProduct, playVoice, settings.weightToleranceGrams, userMode, verificationStatus]);

  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const nextSettings = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      return nextSettings;
    });
  }, []);


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
            minimumStock: p.minimumStock ?? 5,
            description: p.description || '',
            aisleLocation: '',
            image: p.image || '',
            expirationDate: p.expirationDate || '',
          }));
          setProducts(mapped);
        }
      })
      .catch((err) => console.error('Failed to load products from backend', err));
    return () => {
      mounted = false;
    };
  }, []);


  const resetShoppingSession = useCallback(() => {
    verificationAttemptRef.current += 1;
    verificationInProgressRef.current = false;
    removalInProgressRef.current = false;
    setCartId('');
    setSessionError(null);
    setCartItems([]);
    setBudget(0);
    setPendingProduct(null);
    setVerificationStatus('WAITING');
    setDetectedWeight(null);
    setScanError(null);
    setItemToRemove(null);
    setRemovalStatus('WAITING_FOR_REMOVAL');
    weightAnomalyRef.current = null;
    setWeightAnomaly(null);
    backgroundBaselineRef.current = null;
    setSelectedProductCategory('All');
    setHasSetBudget(false);
    setCartStatus('ACTIVE');
    setCheckoutSubmitting(false);
    setCheckoutError(null);
    setUserMode('CUSTOMER');
    setCustomerScreenState('WELCOME');
  }, []);



  useEffect(() => {
    if (
      customerScreen !== 'WAITING_FOR_CASHIER' ||
      cartStatus !== 'WAITING_FOR_CASHIER' ||
      !cartId
    ) return;

    let stopped = false;
    let requestInFlight = false;
    let intervalId: number | undefined;

    const checkPaymentStatus = async () => {
      if (requestInFlight || stopped) return;
      requestInFlight = true;

      try {
        const response: any = await getCart(cartId);
        if (stopped || response?.cart?.status !== 'COMPLETED') return;



        try {
          const transactionResponse: any = await getCartTransactions(cartId);
          const transaction = transactionResponse?.transactions?.[0];

          if (!stopped && transaction) {
            const completedTransaction: TransactionRecord = {
              id: transaction.transactionId,
              cartId: transaction.cartId,
              date: transaction.createdAt,
              items: (transaction.items || []).map((item: any) => ({
                product: {
                  id: String(item.productId),
                  barcode: item.barcode,
                  name: item.name,
                  category: '',
                  price: item.price,
                  expectedWeightGrams: 0,
                  stock: 0,
                  minimumStock: 0,
                },
                quantity: item.quantity,
              })),
              total: transaction.total,
              subtotal: transaction.subtotal,
              discount: transaction.discount,
              paymentMethod: transaction.paymentMethod,
              amountReceived: transaction.amountReceived,
              change: transaction.change,
              paymentStatus: transaction.paymentStatus,
              cashierName: transaction.cashierId,
            };

            setTransactions((previous) => [
              completedTransaction,
              ...previous.filter((item) => item.id !== completedTransaction.id),
            ]);
          }
        } catch {

        }

        if (stopped) return;
        stopped = true;
        if (intervalId !== undefined) window.clearInterval(intervalId);
        soundService.playSuccessChime();
        playVoice('Payment confirmed. Thank you for shopping with iCart. The cart is ready for the next customer.');
        resetShoppingSession();
      } catch {

      } finally {
        requestInFlight = false;
      }
    };

    void checkPaymentStatus();
    intervalId = window.setInterval(checkPaymentStatus, 2000);

    return () => {
      stopped = true;
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [cartId, cartStatus, customerScreen, playVoice, resetShoppingSession]);


  const startShoppingSession = useCallback(() => {

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


  const startProductVerification = useCallback(
    async (
      product: Product,
      simulateFailure: boolean = false,
      simulateSuccess: boolean = false
    ) => {
      if (verificationInProgressRef.current) return false;
      verificationInProgressRef.current = true;
      const attempt = ++verificationAttemptRef.current;
      setPendingProduct(product);
      setVerificationStatus('WAITING');
      setDetectedWeight(null);
      setScanError(null);

      try {
        const result = simulateSuccess
          ? {
              verified: true,
              expectedWeightGrams: product.expectedWeightGrams,
              detectedWeightGrams: product.expectedWeightGrams,
              differenceGrams: 0,
              toleranceGrams: settings.weightToleranceGrams,
              reason: undefined,
            }
          : await verifyProductWeight(
              product.expectedWeightGrams,
              settings.weightToleranceGrams,
              simulateFailure,
              'increase',
              () => setVerificationStatus('VERIFYING')
            );

        if (attempt !== verificationAttemptRef.current) return false;
        setDetectedWeight(result.detectedWeightGrams);

        if (!result.verified) {
          soundService.playWarning();
          setVerificationStatus('FAILED');
          const message = result.reason === 'TIMEOUT'
            ? 'No matching weight change was detected. Remove the item and try again.'
            : 'Weight verification failed. Please remove extra items and try again.';
          setScanError(message);
          return false;
        }


        if (cartId) {
          const res: any = await addCartItem(cartId, { barcode: product.barcode, quantity: 1 });
          if (!res?.cart) throw new Error('The server did not return the updated cart.');
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
        soundService.playSuccessChime();
        setVerificationStatus('VERIFIED');
        return true;
      } catch (error) {
        if (attempt !== verificationAttemptRef.current) return false;
        console.error('Product verification failed', error);
        soundService.playWarning();
        setVerificationStatus('FAILED');
        const message = error instanceof Error ? error.message : 'The load cells could not verify this item.';
        setScanError(message);
        return false;
      } finally {
        if (attempt === verificationAttemptRef.current) {
          verificationInProgressRef.current = false;
        }
      }
    },
    [cartId, settings.weightToleranceGrams]
  );

  const retryVerification = useCallback(async () => {
    if (!pendingProduct) return false;
    return startProductVerification(pendingProduct, false);
  }, [pendingProduct, startProductVerification]);



  const confirmPendingProduct = useCallback(async () => {
    if (!pendingProduct) {
      playVoice('Scan a product before pressing the add button.');
      return false;
    }
    if (verificationStatus === 'VERIFIED') return false;
    return startProductVerification(pendingProduct, false);
  }, [pendingProduct, playVoice, startProductVerification, verificationStatus]);

  const cancelVerification = useCallback(() => {
    verificationAttemptRef.current += 1;
    verificationInProgressRef.current = false;
    setPendingProduct(null);
    setVerificationStatus('WAITING');
    setDetectedWeight(null);
    setCustomerScreen('SHOPPING_HOME');
    playVoice('Scan cancelled.');
  }, [playVoice]);


  const updateItemQuantity = useCallback(
    (productId: string, delta: number) => {
      const item = cartItems.find((i) => i.product.id === productId);
      if (!item) return;

      if (delta > 0) {

        void startProductVerification(item.product);
        return;
      }


      promptRemoveItem(item, 1);
    },
    [cartItems, startProductVerification]
  );


  const promptRemoveItem = useCallback(
    (item: CartItem, quantityToRemove: number = item.quantity) => {
      setItemToRemove({ ...item, quantity: Math.min(quantityToRemove, item.quantity) });
      setRemovalStatus('WAITING_FOR_REMOVAL');
    },
    []
  );

  const cancelItemRemoval = useCallback(() => {
    removalAttemptRef.current += 1;
    removalInProgressRef.current = false;
    setItemToRemove(null);
  }, []);

  const startItemRemovalVerification = useCallback(async (simulateSuccess: boolean = false) => {
    if (!itemToRemove) {
      playVoice('Select an item with the minus or trash button before pressing remove.');
      return false;
    }
    if (removalInProgressRef.current && !simulateSuccess) return false;
    if (simulateSuccess) {
      // Cancel a real load-cell wait that may have started automatically when
      // the PC simulator button became visible.
      removalAttemptRef.current += 1;
      removalInProgressRef.current = false;
    }
    removalInProgressRef.current = true;
    const attempt = ++removalAttemptRef.current;
    const targetItem = itemToRemove;
    setRemovalStatus('WAITING_FOR_REMOVAL');

    try {
      const expectedDecrease = targetItem.product.expectedWeightGrams * targetItem.quantity;
      const weightCheck = simulateSuccess
        ? {
            detected: true,
            decreaseGrams: expectedDecrease,
            differenceGrams: 0,
            reason: undefined,
          }
        : await waitForWeightDecrease(
            expectedDecrease,
            settings.weightToleranceGrams,
            () => setRemovalStatus('VERIFYING_REMOVAL')
          );

      if (attempt !== removalAttemptRef.current) return false;
      if (!weightCheck.detected) {
        soundService.playWarning();
        if (weightCheck.reason === 'MISMATCH') {
          setRemovalStatus('REMOVAL_MISMATCH');
        } else {
          setRemovalStatus('REMOVAL_FAILED');
        }
        removalInProgressRef.current = false;
        return false;
      }


      if (cartId) {
        const currentItem = cartItems.find((item) => item.product.id === targetItem.product.id);
        if (!currentItem) throw new Error('Item is no longer in the cart');

        const res: any = targetItem.quantity >= currentItem.quantity
          ? await removeCartItem(cartId, targetItem.product.barcode)
          : await updateCartItem(cartId, targetItem.product.barcode, {
              quantity: currentItem.quantity - targetItem.quantity,
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
          if (item.product.id !== targetItem.product.id) return [item];
          const quantity = item.quantity - targetItem.quantity;
          return quantity > 0 ? [{ ...item, quantity }] : [];
        }));
      }
    } catch (err) {
      if (attempt !== removalAttemptRef.current) return false;
      console.error('Remove cart item failed', err);
      setRemovalStatus('REMOVAL_FAILED');
      removalInProgressRef.current = false;
      return false;
    }

    setRemovalStatus('REMOVED');
    // A verified product can remain pending if the user navigates directly to
    // the cart and removes it without pressing Continue on the verification
    // screen. Clear that stale state so the next barcode is never blocked.
    setPendingProduct(null);
    setVerificationStatus('WAITING');
    setDetectedWeight(null);
    setScanError(null);
    soundService.playSuccessChime();


    setTimeout(() => {
      if (attempt !== removalAttemptRef.current) return;
      setItemToRemove(null);
    }, 1000);

    removalInProgressRef.current = false;
    return true;
  }, [cartId, cartItems, itemToRemove, playVoice, settings.weightToleranceGrams]);

  // Removal verification is a background operation. The customer stays on
  // the cart/shopping screen while a compact feedback banner reports status.
  useEffect(() => {
    if (itemToRemove && removalStatus === 'WAITING_FOR_REMOVAL') {
      void startItemRemovalVerification();
    }
  }, [itemToRemove, removalStatus, startItemRemovalVerification]);


  const confirmCheckout = useCallback(() => {
    if (!cartId) {
      setCheckoutError('No active cart was found. Please return to the cart and try again.');
      playVoice('No active cart found. Please start a shopping session first.');
      return;
    }

    // Show the cashier ticket immediately. The request continues in the
    // background and any failure is displayed on the same screen with Retry.
    setCheckoutError(null);
    setCheckoutSubmitting(true);
    setCartStatus('WAITING_FOR_CASHIER');
    setCustomerScreenState('WAITING_FOR_CASHIER');
    requestCashierCheckout(cartId)
      .then((res: any) => {
        setCartStatus(res?.cart?.status || 'WAITING_FOR_CASHIER');
        setCheckoutSubmitting(false);
        playVoice('Checkout confirmed. Please proceed to any available cashier counter.');
      })
      .catch((err) => {
        console.error('Checkout failed', err);
        setCartStatus('ACTIVE');
        setCheckoutSubmitting(false);
        setCheckoutError(err instanceof Error
          ? err.message
          : 'The cart could not be sent to the cashier. Please try again.');
        soundService.playWarning();
        playVoice('Checkout failed. Please ask a staff member for assistance.');
      });
  }, [cartId, playVoice]);

  const markCashierComplete = useCallback(async (simulateSuccess: boolean = false) => {
    if (!cartId) return false;

    if (simulateSuccess) {
      setTransactions((previous) => [{
        id: `SIM-TXN-${Date.now()}`,
        cartId,
        date: new Date().toISOString(),
        items: cartItems,
        total: currentTotal,
        subtotal: currentTotal,
        discount: 0,
        paymentMethod: 'CASH',
        amountReceived: currentTotal,
        change: 0,
        paymentStatus: 'PAID',
        cashierName: 'SIMULATOR',
      }, ...previous]);
      soundService.playSuccessChime();
      playVoice('Simulated payment confirmed. The cart is ready for the next customer.');
      resetShoppingSession();
      return true;
    }

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
      playVoice('Payment confirmed. Thank you for shopping with iCart. The cart is ready for the next customer.');
      resetShoppingSession();
      return true;
    } catch (err) {
      console.error('Cashier payment failed', err);
      playVoice('Payment could not be completed. Please ask the cashier for assistance.');
      return false;
    }
  }, [cartId, cartItems, currentTotal, playVoice, resetShoppingSession]);


  const loginAdmin = useCallback(async (email: string, pass: string) => {
    try {
      const res = await authenticateAdmin(email, pass);
      setAdminUser({
        id: res.user.id,
        username: res.user.email,
        name: res.user.name,
        phoneNumber: res.user.phoneNumber,
        isEmailVerified: res.user.isEmailVerified,
        createdAt: res.user.createdAt,
        updatedAt: res.user.updatedAt,
        role: 'ADMIN',
      });
      setUserMode('ADMIN');
      setAdminScreen('DASHBOARD');

      const [productRes, transactionRes] = await Promise.all([getProducts(), getTransactions()]);
      if (productRes.products) {
        setProducts(productRes.products.map((p: any) => ({
          id: p._id, barcode: p.barcode, name: p.name, category: p.category, price: p.price,
          expectedWeightGrams: p.weight || 0, stock: p.stock || 0, minimumStock: p.minimumStock ?? 5,
          description: p.description || '', aisleLocation: '', image: p.image || '',
          expirationDate: p.expirationDate || ''
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
      const needsVerification = (error as any)?.body?.code === 'EMAIL_NOT_VERIFIED';
      return { success: false, error: message, needsVerification };
    }
  }, []);

  const logoutAdmin = useCallback(() => {
    clearAdminSession();
    setAdminUser(null);
    setAdminScreen('LOGIN');
    setUserMode('CUSTOMER');
    setCustomerScreen('WELCOME');
  }, []);

  const saveProduct = useCallback(async (product: Product) => {
    const payload = {
      barcode: product.barcode, name: product.name, category: product.category,
      description: product.description || '', price: product.price, stock: product.stock,
      weight: product.expectedWeightGrams, minimumStock: product.minimumStock,
      image: product.image || '', expirationDate: product.expirationDate || null,
      unit: 'piece', isActive: true,
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
        checkoutSubmitting,
        checkoutError,
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
        weightAnomaly,
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
