export type Item = { _id?: string; name: string; quantity: number; price: number; subtotal: number };
export type Cart = { cartId: string; total: number; subtotal: number; status: string; items: Item[]; updatedAt?: string };
export type Transaction = { _id: string; transactionId: string; cartId: string; createdAt: string; items: Item[]; total: number; subtotal: number; paymentMethod: string; cashierId: string; amountReceived?: number; change?: number };
