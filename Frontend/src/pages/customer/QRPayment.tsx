import './QRPayment.css';
import React from 'react';
import { useCart } from '../../context/CartContext';

export const QRPayment: React.FC = () => {
  const { paymentIntent } = useCart();
  const showQrCode = paymentIntent?.qrImage && ['PENDING', 'PROCESSING'].includes(paymentIntent.status);

  return (
    <main className="qr-payment" aria-label="QR Ph payment">
      {showQrCode && (
        <div className="qr-payment__card">
          <strong className="qr-payment__title">SCAN TO PAY HERE</strong>
          <img
            className="qr-payment__code"
            src={paymentIntent.qrImage}
            alt="QR Ph payment code"
            draggable={false}
          />
        </div>
      )}
    </main>
  );
};
