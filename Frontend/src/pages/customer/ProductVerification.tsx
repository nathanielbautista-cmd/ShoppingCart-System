import React from 'react';
import { useCart } from '../../context/CartContext';
import { WeightVerification } from '../../components/WeightVerification';

export const ProductVerification: React.FC = () => {
  const { setCustomerScreen, cancelVerification } = useCart();

  const handleContinue = () => {
    // Verified item has been added to cartItems in CartContext
    setCustomerScreen('CART');
  };

  const handleCancel = () => {
    cancelVerification();
  };

  return (
    <WeightVerification
      onContinue={handleContinue}
      onCancel={handleCancel}
    />
  );
};
