import './AdminTransactions.css';
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { CheckCircle2, Eye } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { TransactionRecord } from '../../types';

export const AdminTransactions: React.FC = () => {
  const { transactions, settings } = useCart();
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  return (
    <div className="admin-transactions__item-1">

      <div className="admin-transactions__item-2">
        <h2 className="admin-transactions__item-3">Transaction Logs</h2>
      </div>


      <div className="admin-transactions__item-4">
        <table className="admin-transactions__item-5">
          <thead className="admin-transactions__item-6">
            <tr>
              <th className="admin-transactions__item-7">Transaction ID</th>
              <th className="admin-transactions__item-8">Cart ID</th>
              <th className="admin-transactions__item-9">Date & Time</th>
              <th className="admin-transactions__item-10">Items</th>
              <th className="admin-transactions__item-11">Total Amount</th>
              <th className="admin-transactions__item-12">Payment Status</th>
              <th className="admin-transactions__item-13">Receipt</th>
            </tr>
          </thead>
          <tbody className="admin-transactions__item-14">
            {transactions.map((tx) => (
              <tr key={tx.id} className="admin-transactions__item-15">
                <td className="admin-transactions__item-16">{tx.id}</td>
                <td className="admin-transactions__item-17">{tx.cartId}</td>
                <td className="admin-transactions__item-18">{new Date(tx.date).toLocaleString()}</td>
                <td className="admin-transactions__item-19">
                  {tx.items.reduce((acc, i) => acc + i.quantity, 0)} items
                </td>
                <td className="admin-transactions__item-20">
                  {settings.currencySymbol} {tx.total.toFixed(2)}
                </td>
                <td className="admin-transactions__item-21">
                  <span className="admin-transactions__item-22">
                    <CheckCircle2 className="admin-transactions__item-23" />
                    <span>{tx.paymentStatus}</span>
                  </span>
                </td>
                <td className="admin-transactions__item-24">
                  <button
                    onClick={() => setSelectedTx(tx)}
                    className="admin-transactions__item-25"
                  >
                    <Eye className="admin-transactions__item-26" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <Modal
        isOpen={selectedTx !== null}
        onClose={() => setSelectedTx(null)}
        title="Transaction Receipt"
        maxWidth="md"
      >
        {selectedTx && (
          <div className="admin-transactions__item-27">
            <div className="admin-transactions__item-28">
              <span className="admin-transactions__item-29">Transaction ID:</span>
              <span className="admin-transactions__item-30">{selectedTx.id}</span>
            </div>
            <div className="admin-transactions__item-31">
              <span className="admin-transactions__item-32">Cart ID:</span>
              <span className="admin-transactions__item-33">{selectedTx.cartId}</span>
            </div>
            <div className="admin-transactions__item-34">
              <span className="admin-transactions__item-35">Date:</span>
              <span className="admin-transactions__item-36">{new Date(selectedTx.date).toLocaleString()}</span>
            </div>
            <div className="admin-transactions__item-37">
              <span className="admin-transactions__item-38">Cashier Counter:</span>
              <span className="admin-transactions__item-39">{selectedTx.cashierName || 'Express Desk'}</span>
            </div>

            <div className="admin-transactions__item-40">
              <div className="admin-transactions__item-41">Purchased Items</div>
              <div className="admin-transactions__item-42">
                {selectedTx.items.map((it, idx) => (
                  <div key={idx} className="admin-transactions__item-43">
                    <span>
                      {it.product.name} × {it.quantity}
                    </span>
                    <span className="admin-transactions__item-44">
                      {settings.currencySymbol} {(it.product.price * it.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-transactions__item-45">
              <span className="admin-transactions__item-46">SUBTOTAL</span>
              <span className="admin-transactions__item-47">
                {settings.currencySymbol} {(selectedTx.subtotal ?? selectedTx.total).toFixed(2)}
              </span>
            </div>
            {(selectedTx.discount ?? 0) > 0 && <div className="admin-transactions__item-45">
              <span className="admin-transactions__item-46">DISCOUNT</span>
              <span className="admin-transactions__item-47">-{settings.currencySymbol} {selectedTx.discount!.toFixed(2)}</span>
            </div>}
            <div className="admin-transactions__item-45">
              <span className="admin-transactions__item-46">TOTAL PAID</span>
              <span className="admin-transactions__item-47">
                {settings.currencySymbol} {selectedTx.total.toFixed(2)}
              </span>
            </div>
            <div className="admin-transactions__item-45">
              <span className="admin-transactions__item-46">PAYMENT</span>
              <span className="admin-transactions__item-47">{selectedTx.paymentMethod || 'CASH'}</span>
            </div>
            <div className="admin-transactions__item-45">
              <span className="admin-transactions__item-46">AMOUNT RECEIVED</span>
              <span className="admin-transactions__item-47">{settings.currencySymbol} {(selectedTx.amountReceived ?? selectedTx.total).toFixed(2)}</span>
            </div>
            <div className="admin-transactions__item-45">
              <span className="admin-transactions__item-46">CHANGE</span>
              <span className="admin-transactions__item-47">{settings.currencySymbol} {(selectedTx.change ?? 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
