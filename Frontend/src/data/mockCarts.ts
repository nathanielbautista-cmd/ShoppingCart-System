import { MonitoredCart } from '../types';

export const INITIAL_CARTS: MonitoredCart[] = [
  {
    cartId: 'ICART-001',
    status: 'SHOPPING',
    currentTotal: 165.0,
    connectionStatus: 'ONLINE',
    itemCount: 3,
    lastActive: 'Just now (This Unit)',
  },
  {
    cartId: 'ICART-002',
    status: 'WAITING FOR CASHIER',
    currentTotal: 450.0,
    connectionStatus: 'ONLINE',
    itemCount: 5,
    lastActive: '2 mins ago',
  },
  {
    cartId: 'ICART-003',
    status: 'IDLE',
    currentTotal: 0.0,
    connectionStatus: 'OFFLINE',
    itemCount: 0,
    lastActive: '35 mins ago',
  },
  {
    cartId: 'ICART-004',
    status: 'SHOPPING',
    currentTotal: 290.0,
    connectionStatus: 'ONLINE',
    itemCount: 4,
    lastActive: '1 min ago',
  },
];
