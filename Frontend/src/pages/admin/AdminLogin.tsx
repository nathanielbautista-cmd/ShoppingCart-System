import './AdminLogin.css';
import React, { useState } from 'react';
import { Shield, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/Button';

export const AdminLogin: React.FC = () => {
  const { loginAdmin, setUserMode, setCustomerScreen } = useCart();
  const [username, setUsername] = useState('admin@icart.com');
  const [password, setPassword] = useState('password');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    const res = await loginAdmin(username, password);
    if (!res.success) {
      setErrorMessage(res.error || 'Invalid credentials');
    }
  };

  const handleBack = () => {
    setUserMode('CUSTOMER');
    setCustomerScreen('WELCOME');
  };

  return (
    <div className="admin-login__item-1">
      {/* Header */}
      <div className="admin-login__item-2">
        <div className="admin-login__item-3">
          <Shield className="admin-login__item-4" />
        </div>
        <h2 className="admin-login__item-5">Admin </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="admin-login__item-6">
        {errorMessage && (
          <div role="alert" aria-live="assertive" className="admin-login__item-7">
            <AlertCircle className="admin-login__item-8" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="admin-login__item-9">
          <label className="admin-login__item-10">
            Admin email
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setErrorMessage('');
            }}
            className="admin-login__item-11"
            placeholder="admin@icart.com"
            aria-invalid={Boolean(errorMessage)}
          />
        </div>

        <div className="admin-login__item-12">
          <label className="admin-login__item-13">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMessage('');
            }}
            className="admin-login__item-14"
            placeholder="password"
            aria-invalid={Boolean(errorMessage)}
          />
        </div>

        <Button
          type="submit"
          variant="glow"
          size="md"
          className="admin-login__item-15"
          icon={<KeyRound className="admin-login__item-16" />}
        >
          Login to Admin 
        </Button>
      </form>

      {/* Footer */}
      <div className="admin-login__item-17">
        <Button
          variant="ghost"
          size="sm"
          className="admin-login__item-18"
          icon={<ArrowLeft className="admin-login__item-19" />}
          onClick={handleBack}
        >
          Return to Customer Screen
        </Button>
      </div>
    </div>
  );
};
