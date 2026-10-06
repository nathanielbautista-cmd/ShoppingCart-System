import './Welcome.css';
import React from 'react';
import { ShoppingCart, ArrowRight, Wifi, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';

export const Welcome: React.FC = () => {
  const { startShoppingSession, setUserMode, setAdminScreen, sessionError } = useCart();

  const openAdminLogin = () => {
    setAdminScreen('LOGIN');
    setUserMode('ADMIN');
  };

  return <div className="welcome-page">
    <div className="welcome-page__topbar">
      <div className="welcome-page__brand">
        <button type="button" className="welcome-page__brand-mark" aria-label="Open admin login" onClick={openAdminLogin}>
          <ShoppingCart />
        </button>
        <strong>iCart</strong>
      </div>
      <div className="welcome-page__online"><Wifi /> System online</div>
    </div>
    <main className="welcome-page__content">
      <section className="welcome-page__hero" aria-label="Welcome">
        <div className="welcome-page__icon"><ShoppingCart /></div>
        <h1>Welcome</h1>
      </section>
      <div className="welcome-page__actions">
        {sessionError && <div className="welcome-page__error"><AlertCircle /><span>{sessionError}</span></div>}
        <Button variant="glow" size="lg" className="welcome-page__start" icon={<ArrowRight />} onClick={startShoppingSession}>Start shopping</Button>
      </div>
    </main>
  </div>;
};
