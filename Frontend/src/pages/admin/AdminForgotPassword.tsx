import React, { useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Button } from '../../components/Button';
import { requestPasswordReset, resetAccountPassword } from '../../services/adminService';

interface AdminForgotPasswordProps {
  initialEmail?: string;
  onLogin: () => void;
}

const passwordIsStrong = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

export const AdminForgotPassword: React.FC<AdminForgotPasswordProps> = ({ initialEmail = '', onLogin }) => {
  const [stage, setStage] = useState<'REQUEST' | 'RESET' | 'DONE'>('REQUEST');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const validPassword = useMemo(() => passwordIsStrong(newPassword), [newPassword]);

  const requestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await requestPasswordReset(email, 'admin');
      setMessage(response.message);
      setCode('');
      setStage('RESET');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the reset code.');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validPassword) {
      setError('Use at least 8 characters with uppercase, lowercase, number, and special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await resetAccountPassword(email, 'admin', code, newPassword);
      setMessage(response.message);
      setStage('DONE');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset the password.');
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'DONE') {
    return (
      <div className="admin-auth-form admin-auth-complete">
        <CheckCircle2 />
        <div className="admin-auth-message admin-auth-message--success">{message}</div>
        <Button type="button" variant="glow" size="md" className="admin-auth-primary" onClick={onLogin}>
          Return to login
        </Button>
      </div>
    );
  }

  return (
    <>
      {error && <div role="alert" className="admin-auth-message admin-auth-message--error">{error}</div>}
      {message && !error && <div role="status" className="admin-auth-message admin-auth-message--success">{message}</div>}
      {stage === 'REQUEST' ? (
        <form className="admin-auth-form" onSubmit={requestCode}>
          <label>
            <span>Admin email</span>
            <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} autoComplete="email" required autoFocus />
          </label>
          <Button type="submit" variant="glow" size="md" className="admin-auth-primary" icon={<Mail />} disabled={busy}>
            {busy ? 'Sending code...' : 'Send reset code'}
          </Button>
          <button type="button" className="admin-auth-link admin-auth-link--muted" onClick={onLogin}>Back to login</button>
        </form>
      ) : (
        <form className="admin-auth-form" onSubmit={submitReset}>
          <label>
            <span>6-digit reset code</span>
            <input className="admin-auth-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, '')); setError(''); }} autoComplete="one-time-code" placeholder="000000" required autoFocus />
          </label>
          <label>
            <span>New password</span>
            <input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setError(''); }} autoComplete="new-password" required />
          </label>
          <label>
            <span>Confirm new password</span>
            <input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(''); }} autoComplete="new-password" required />
          </label>
          <p className="admin-auth-hint">At least 8 characters with uppercase, lowercase, number, and special character.</p>
          <Button type="submit" variant="glow" size="md" className="admin-auth-primary" icon={<KeyRound />} disabled={busy || code.length !== 6}>
            {busy ? 'Resetting password...' : 'Reset password'}
          </Button>
          <button type="button" className="admin-auth-link" onClick={() => void requestCode()} disabled={busy}>Resend reset code</button>
          <button type="button" className="admin-auth-link admin-auth-link--muted" onClick={onLogin}>Back to login</button>
        </form>
      )}
    </>
  );
};
