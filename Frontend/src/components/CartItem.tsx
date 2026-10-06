import './CartItem.css';
import React from 'react';
import { Plus, Minus, Trash2, Package } from 'lucide-react';
import { CartItem as CartItemType } from '../types';
import { useCart } from '../context/CartContext';
import { soundService } from '../services/soundService';

interface CartItemProps {
  item: CartItemType;
}

export const CartItemRow: React.FC<CartItemProps> = ({ item }) => {
  const { updateItemQuantity, promptRemoveItem, settings } = useCart();
  const { product, quantity } = item;

  const itemTotal = product.price * quantity;

  const handleDecrease = () => {
    soundService.playKeyClick();
    updateItemQuantity(product.id, -1);
  };

  const handleIncrease = () => {
    soundService.playKeyClick();
    updateItemQuantity(product.id, 1);
  };

  const handleRemove = () => {
    soundService.playKeyClick();
    promptRemoveItem(item);
  };

  return (
    <div className="cart-item__item-1">
      {/* Product Details */}
      <div className="cart-item__item-2">
        <div className="cart-item__item-3">
          <Package className="cart-item__item-4" />
        </div>

        <div className="cart-item__item-5">
          <div className="cart-item__item-6">
            <span className="cart-item__item-7">
              {product.name}
            </span>
            <span className="cart-item__item-8">
              {product.category}
            </span>
          </div>

          <div className="cart-item__item-9">
            <span className="cart-item__item-10">
              {settings.currencySymbol}{product.price.toFixed(2)}
            </span>
            <span>·</span>
            <span>{product.expectedWeightGrams}g</span>
          </div>
        </div>
      </div>

      {/* Quantity & Actions */}
      <div className="cart-item__item-11">
        <div className="cart-item__item-12">
          <div className="cart-item__item-13">
            {settings.currencySymbol}{itemTotal.toFixed(2)}
          </div>
          <div className="cart-item__item-14">
            Qty: {quantity}
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="cart-item__item-15">
          <button
            onClick={handleDecrease}
            aria-label={`Decrease ${product.name}`}
            className="cart-item__item-16"
          >
            <Minus className="cart-item__item-17" />
          </button>

          <span className="cart-item__item-18">
            {quantity}
          </span>

          <button
            onClick={handleIncrease}
            aria-label={`Increase ${product.name}`}
            className="cart-item__item-19"
          >
            <Plus className="cart-item__item-20" />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={handleRemove}
          aria-label={`Remove ${product.name} from cart`}
          className="cart-item__item-21"
          title="Remove Item"
        >
          <Trash2 className="cart-item__item-22" />
        </button>
      </div>
    </div>
  );
};
