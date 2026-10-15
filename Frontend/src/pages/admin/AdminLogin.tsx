import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '../../components/Button';
import { useCart } from '../../context/CartContext';

interface AdminLoginProps {
  onSignup: () => void;
  onForgotPassword: (email: string) => void;
  onNeedsVerification: (email: string, password: string, message: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSignup, onForgotPassword, onNeedsVerification }) => {
  const { loginAdmin } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    const result = await loginAdmin(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      const message = result.error || 'Invalid credentials';
      if (result.needsVerification) {
        onNeedsVerification(email, password, message);
      } else {
        setErrorMessage(message);
      }
    }
  };

  return (
    <>
      {errorMessage && <div role="alert" className="admin-auth-message admin-auth-message--error">{errorMessage}</div>}
      <form onSubmit={handleLogin} className="admin-auth-form">
        <label>
          <span>Admin email</span>
          <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrorMessage(''); }} placeholder="Enter Email" autoComplete="email" required />
        </label>
        <label>
          <span>Password</span>
          <div className="admin-auth-password-field">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setErrorMessage(''); }} placeholder="Enter your password" autoComplete="current-password" required />
            <button type="button" className="admin-auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </label>
        <button type="button" className="admin-auth-link admin-auth-forgot-link" onClick={() => onForgotPassword(email)}>Forgot password?</button>
        <Button type="submit" variant="glow" size="md" className="admin-auth-primary" icon={<KeyRound />} disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Login to Admin'}
        </Button>
        <button type="button" className="admin-auth-link" onClick={onSignup}>Create an admin account</button>
      </form>
    </>
  );
};
