import './Help.css';
import React from 'react';
import {
  Scan,
  Wallet,
  ReceiptText,
  HelpCircle,
  Scale,
  MinusCircle,
  ShoppingCart,
} from 'lucide-react';

export const Help: React.FC = () => {
  const steps = [
    {
      num: '1',
      title: 'Scan product barcode',
      desc: 'Stay on the shopping screen and point the barcode at the scanner. iCart reads it automatically—no product button is needed. Wait for the scale-ready prompt before putting the item in the basket.',
      icon: <Scan className="help__item-1" />,
    },
    {
      num: '2',
      title: 'Place item in cart',
      desc: 'Put only the scanned product in the basket. Keep the basket still while iCart compares the measured weight with the expected weight. If it fails, remove extra items and try again.',
      icon: <Scale className="help__item-2" />,
    },
    {
      num: '3',
      title: 'Monitor budget',
      desc: 'Open Budget any time to view your total, remaining amount, and warning level. You may adjust the budget before checkout.',
      icon: <Wallet className="help__item-3" />,
    },
    {
      num: '4',
      title: 'Proceed to checkout',
      desc: 'Open My Cart, review the total, then tap Pay with QR Ph. Scan the code using a participating bank or e-wallet and wait for automatic verification.',
      icon: <ReceiptText className="help__item-4" />,
    },
  ];

  return (
    <div className="help__item-5">

      <div className="help__item-6">
        <div className="help__item-7">
          <HelpCircle className="help__item-8" />
        </div>
        <div>
          <h2 className="help__item-9">How to Use the Cart</h2>
        </div>
      </div>


      <div className="help__item-10">
        <div className="help__item-11">
          {steps.map((step) => (
            <div
              key={step.num}
              className="help__item-12"
            >
              <div className="help__item-13">
                {step.num}
              </div>
              <div>
                <h3 className="help__item-14">
                  <span>{step.title}</span>
                  {step.icon}
                </h3>
                <p className="help__item-15">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="help__item-16">
          <div className="help__item-17">
            <MinusCircle className="help__item-18" />
            <span>
              <strong className="help__item-19">Remove an item:</strong> Make changes before generating the QR code. Open My Cart, tap the trash icon, then remove the selected item when prompted.
            </span>
          </div>
          <div className="help__item-20">
            <ShoppingCart className="help__item-21" />
            <span>
              <strong className="help__item-22">Add another unit:</strong> Scan the same barcode again, then place one more unit in the basket for verification.
            </span>
          </div>
         
        </div>
      </div>
    </div>
  );
};
