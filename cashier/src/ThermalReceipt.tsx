import type { Transaction } from './types';

const amount = (value: number) => `PHP ${Number(value || 0).toFixed(2)}`;

export function ThermalReceipt({ transaction }: { transaction: Transaction }) {
  const paid = transaction.amountReceived ?? transaction.total;
  const change = transaction.change ?? 0;

  return (
    <section className="cashier-thermal-receipt" aria-hidden="true">
      <header className="cashier-thermal-receipt__header">
        <strong>Metro Supermarket</strong>
        <span>OFFICIAL RECEIPT</span>
      </header>

      <div className="cashier-thermal-receipt__details">
        <p><span>Transaction:</span><b>{transaction.transactionId}</b></p>
        <p><span>Cart:</span><b>{transaction.cartId}</b></p>
        <p><span>Date:</span><b>{new Date(transaction.createdAt).toLocaleString()}</b></p>
        <p><span>Cashier:</span><b>{transaction.cashierId}</b></p>
        <p><span>Payment:</span><b>{transaction.paymentMethod || 'CASH'}</b></p>
      </div>

      <div className="cashier-thermal-receipt__divider" />
      <div className="cashier-thermal-receipt__items">
        {transaction.items.map((item, index) => (
          <div className="cashier-thermal-receipt__item" key={item._id || `${item.barcode}-${index}`}>
            <strong>{item.name}</strong>
            <p>
              <span>{item.quantity} x {amount(item.price)}</span>
              <b>{amount(item.subtotal || item.price * item.quantity)}</b>
            </p>
          </div>
        ))}
      </div>

      <div className="cashier-thermal-receipt__divider" />
      <div className="cashier-thermal-receipt__totals">
        <p><span>Subtotal</span><b>{amount(transaction.subtotal ?? transaction.total)}</b></p>
        <p className="cashier-thermal-receipt__total"><span>TOTAL</span><b>{amount(transaction.total)}</b></p>
        <p><span>Cash received</span><b>{amount(paid)}</b></p>
        <p><span>Change</span><b>{amount(change)}</b></p>
      </div>

      <footer className="cashier-thermal-receipt__footer">
        <strong>Thank you for shopping!</strong>
        <span>Please keep this receipt.</span>
      </footer>
    </section>
  );
}
