import './AdminLogin.css';
import React, { useState } from 'react';
import { ArrowLeft, MailCheck, Shield } from 'lucide-react';
import { Button } from '../../components/Button';
import { useCart } from '../../context/CartContext';
import { AdminLogin } from './AdminLogin';
import { Signup } from './Signup';
import { AdminEmailVerification } from './AdminEmailVerification';
import { AdminForgotPassword } from './AdminForgotPassword';

type AuthView = 'LOGIN' | 'SIGNUP' | 'VERIFY' | 'FORGOT';

export const AdminAuth: React.FC = () => {
  const { setUserMode, setCustomerScreen } = useCart();
  const [view, setView] = useState<AuthView>('LOGIN');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

  const openVerification = (email: string, password: string, message: string) => {
    setPendingEmail(email);
    setPendingPassword(password);
    setVerificationMessage(message);
    setView('VERIFY');
  };

  const returnToCustomer = () => {
    setUserMode('CUSTOMER');
    setCustomerScreen('WELCOME');
  };

  const title = view === 'LOGIN'
    ? 'Admin Login'
    : view === 'SIGNUP'
      ? 'Create Admin Account'
      : view === 'VERIFY'
        ? 'Verify Your Email'
        : 'Reset Admin Password';
  const subtitle = view === 'VERIFY'
    ? `Enter the 6-digit code sent to ${pendingEmail}`
    : '';

  return (
    <div className="admin-auth-shell">
      <section className="admin-auth-card" aria-labelledby="admin-auth-title">
        <header className="admin-auth-header">
          <div className="admin-auth-icon">{view === 'VERIFY' ? <MailCheck /> : <Shield />}</div>
          <h1 id="admin-auth-title">{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>

        {view === 'LOGIN' && <AdminLogin onSignup={() => setView('SIGNUP')} onForgotPassword={(email) => { setPendingEmail(email); setView('FORGOT'); }} onNeedsVerification={openVerification} />}
        {view === 'SIGNUP' && <Signup onLogin={() => setView('LOGIN')} onVerification={openVerification} />}
        {view === 'VERIFY' && <AdminEmailVerification email={pendingEmail} password={pendingPassword} initialMessage={verificationMessage} onLogin={() => setView('LOGIN')} />}
        {view === 'FORGOT' && <AdminForgotPassword initialEmail={pendingEmail} onLogin={() => setView('LOGIN')} />}

        {view !== 'SIGNUP' && (
          <footer className="admin-auth-footer">
            <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={returnToCustomer}>Return to Customer Screen</Button>
          </footer>
        )}
      </section>
    </div>
  );
};
