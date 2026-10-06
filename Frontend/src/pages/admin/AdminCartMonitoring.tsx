import './AdminCartMonitoring.css';
import React, { useCallback, useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../../components/Button';
import { getWaitingCarts } from '../../services/cartApi';

export const AdminCartMonitoring: React.FC = () => {
  const {
    monitoredCarts,
    cartId: currentUnitCartId,
    cartStatus: currentUnitStatus,
    currentTotal: currentUnitTotal,
    cartItems,
    simulateCashierCompleteForCart,
    settings,
  } = useCart();

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'WAITING'>('ALL');
  const [liveWaitingCarts, setLiveWaitingCarts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingCartId, setProcessingCartId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadWaitingCarts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response: any = await getWaitingCarts();
      setLiveWaitingCarts(Array.isArray(response?.carts) ? response.carts : []);
    } catch (err) {
      console.error('Could not load cashier queue', err);
      setError('Cashier queue is unavailable. Check the backend connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWaitingCarts();
    const interval = window.setInterval(loadWaitingCarts, 5000);
    return () => window.clearInterval(interval);
  }, [loadWaitingCarts]);

  const mockCarts = monitoredCarts.map((c) => {
    if (c.cartId === currentUnitCartId) {
      return {
        ...c,
        status:
          currentUnitStatus === 'WAITING_FOR_CASHIER'
            ? ('WAITING FOR CASHIER' as const)
            : currentUnitStatus === 'COMPLETED'
            ? ('COMPLETED' as const)
            : ('SHOPPING' as const),
        currentTotal: currentUnitTotal,
        itemCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),
        lastActive: 'Just now (This Unit)',
      };
    }
    return c;
  });

  const liveCarts = liveWaitingCarts.map((cart) => ({
    cartId: cart.cartId,
    status: 'WAITING FOR CASHIER' as const,
    currentTotal: Number(cart.total || 0),
    connectionStatus: 'ONLINE' as const,
    itemCount: Array.isArray(cart.items) ? cart.items.reduce((total: number, item: any) => total + Number(item.quantity || 0), 0) : 0,
    lastActive: cart.updatedAt ? new Date(cart.updatedAt).toLocaleTimeString() : 'Just now',
  }));
  const liveCartIds = new Set(liveCarts.map((cart) => cart.cartId));
  const allCarts = [...liveCarts, ...mockCarts.filter((cart) => !liveCartIds.has(cart.cartId))];

  const filteredCarts = allCarts.filter((c) => {
    if (filter === 'ACTIVE') return c.status === 'SHOPPING';
    if (filter === 'WAITING') return c.status === 'WAITING FOR CASHIER';
    return true;
  });

  return (
    <div className="admin-cart-monitoring__item-1">
      {/* Header */}
      <div className="admin-cart-monitoring__item-2">
        <div>
          <h2 className="admin-cart-monitoring__item-3">Cart Monitoring & Cashier Desk</h2>
        </div>

        {/* Filter buttons */}
        <div className="admin-cart-monitoring__item-4">
          {(['ALL', 'ACTIVE', 'WAITING'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={loadWaitingCarts}
            title="Refresh cashier queue"
            className="admin-cart-monitoring__item-5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <p className="admin-cart-monitoring__item-6">{error}</p>}

      {/* Cart Grid */}
      <div className="admin-cart-monitoring__item-7">
        {filteredCarts.map((cart) => {
          const isCurrentUnit = cart.cartId === currentUnitCartId;
          const isWaitingCashier = cart.status === 'WAITING FOR CASHIER';

          return (
            <div
              key={cart.cartId}
              className={`p-3.5 rounded-2xl border transition-all shadow-xs ${
                isWaitingCashier
                  ? 'bg-blue-50/70 border-blue-400'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="admin-cart-monitoring__item-8">
                <div className="admin-cart-monitoring__item-9">
                  <div className="admin-cart-monitoring__item-10">
                    {cart.cartId}
                  </div>
                  <div>
                    <div className="admin-cart-monitoring__item-11">
                      <span className="admin-cart-monitoring__item-12">
                        {cart.cartId}
                      </span>
                      {isCurrentUnit && (
                        <span className="admin-cart-monitoring__item-13">
                          THIS PHYSICAL UNIT
                        </span>
                      )}
                    </div>
                    <span className="admin-cart-monitoring__item-14">
                      {cart.lastActive} · {cart.itemCount} items
                    </span>
                  </div>
                </div>

                {/* Connection Status */}
                <div className="admin-cart-monitoring__item-15">
                  {cart.connectionStatus === 'ONLINE' ? (
                    <span className="admin-cart-monitoring__item-16">
                      <Wifi className="admin-cart-monitoring__item-17" />
                      <span>ONLINE</span>
                    </span>
                  ) : (
                    <span className="admin-cart-monitoring__item-18">
                      <WifiOff className="admin-cart-monitoring__item-19" />
                      <span>OFFLINE</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Status and Total */}
              <div className="admin-cart-monitoring__item-20">
                <div>
                  <span className="admin-cart-monitoring__item-21">
                    Cart Status
                  </span>
                  <span
                    className={`text-xs font-black uppercase ${
                      isWaitingCashier
                        ? 'text-blue-700 animate-pulse'
                        : cart.status === 'SHOPPING'
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {cart.status}
                  </span>
                </div>

                <div className="admin-cart-monitoring__item-22">
                  <span className="admin-cart-monitoring__item-23">
                    Basket Total
                  </span>
                  <span className="admin-cart-monitoring__item-24">
                    {settings.currencySymbol} {cart.currentTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Cashier Actions */}
              {isWaitingCashier && (
                <div className="admin-cart-monitoring__item-25">
                  <Button
                    variant="primary"
                    size="sm"
                    className="admin-cart-monitoring__item-26"
                    icon={<CheckCircle className="admin-cart-monitoring__item-27" />}
                    onClick={async () => {
                      setProcessingCartId(cart.cartId);
                      setError('');
                      try {
                        const completed = await simulateCashierCompleteForCart(cart.cartId, cart.currentTotal);
                        if (completed) {
                          await loadWaitingCarts();
                        } else {
                          setError(`Payment for cart ${cart.cartId} could not be completed. Check the cart and inventory.`);
                        }
                      } finally {
                        setProcessingCartId(null);
                      }
                    }}
                    disabled={processingCartId === cart.cartId}
                  >
                    {processingCartId === cart.cartId ? 'Processing payment…' : 'Cashier: Receive Payment & Clear Cart'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
