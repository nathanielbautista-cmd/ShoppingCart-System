import React from 'react';
import { useCart } from '../../context/CartContext';
import { WeightVerification } from '../../components/WeightVerification';

export const ProductVerification: React.FC = () => {
  const { setCustomerScreen, setPendingProduct, cancelVerification } = useCart();

  const handleContinue = () => {

    setPendingProduct(null);
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
