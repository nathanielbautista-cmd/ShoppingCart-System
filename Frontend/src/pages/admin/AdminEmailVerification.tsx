import React, { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Button } from '../../components/Button';
import { useCart } from '../../context/CartContext';
import { resendAdminVerification, verifyAdminEmail } from '../../services/adminService';

interface AdminEmailVerificationProps {
  email: string;
  password: string;
  initialMessage?: string;
  onLogin: () => void;
}

export const AdminEmailVerification: React.FC<AdminEmailVerificationProps> = ({ email, password, initialMessage, onLogin }) => {
  const { loginAdmin } = useCart();
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState(initialMessage || 'Check your email for the verification code.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      await verifyAdminEmail(email, verificationCode);
      const loginResult = await loginAdmin(email, password);
      if (!loginResult.success) {
        setSuccessMessage('Email verified. You can now sign in.');
        onLogin();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      const response = await resendAdminVerification(email);
      setVerificationCode('');
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to resend the verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {errorMessage && <div role="alert" className="admin-auth-message admin-auth-message--error">{errorMessage}</div>}
      {successMessage && <div role="status" className="admin-auth-message admin-auth-message--success">{successMessage}</div>}
      <form onSubmit={handleVerify} className="admin-auth-form">
        <label>
          <span>Verification code</span>
          <input className="admin-auth-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(event) => { setVerificationCode(event.target.value.replace(/\D/g, '')); setErrorMessage(''); }} placeholder="000000" autoComplete="one-time-code" required />
        </label>
        <Button type="submit" variant="glow" size="md" className="admin-auth-primary" icon={<MailCheck />} disabled={isSubmitting || verificationCode.length !== 6}>
          {isSubmitting ? 'Verifying...' : 'Verify Email'}
        </Button>
        <button type="button" className="admin-auth-link" onClick={handleResend} disabled={isSubmitting}>Resend verification code</button>
        <button type="button" className="admin-auth-link admin-auth-link--muted" onClick={onLogin}>Back to login</button>
      </form>
    </>
  );
};
