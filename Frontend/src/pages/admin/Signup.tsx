import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { Button } from '../../components/Button';
import { registerAdmin } from '../../services/adminService';

interface SignupProps {
  onLogin: () => void;
  onVerification: (email: string, password: string, message: string) => void;
}

const passwordChecks = (password: string) => [
  { label: '8 or more characters', valid: password.length >= 8 },
  { label: 'Uppercase and lowercase letters', valid: /[A-Z]/.test(password) && /[a-z]/.test(password) },
  { label: 'At least one number', valid: /\d/.test(password) },
  { label: 'At least one special character', valid: /[^A-Za-z0-9]/.test(password) },
];

export const Signup: React.FC<SignupProps> = ({ onLogin, onVerification }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requirements = useMemo(() => passwordChecks(password), [password]);
  const passwordIsStrong = requirements.every((item) => item.valid);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    if (!passwordIsStrong) {
      setErrorMessage('Please complete every password requirement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await registerAdmin({ name, email, phoneNumber, password });
      onVerification(response.email || email.trim().toLowerCase(), password, response.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create the admin account.';
      if ((error as any)?.body?.code === 'EMAIL_NOT_VERIFIED') {
        onVerification(email.trim().toLowerCase(), password, message);
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {errorMessage && <div role="alert" className="admin-auth-message admin-auth-message--error">{errorMessage}</div>}
      <form onSubmit={handleSignup} className="admin-auth-form">
        <div className="admin-auth-grid">
          <label>
            <span>Full name</span>
            <input type="text" value={name} onChange={(event) => { setName(event.target.value); setErrorMessage(''); }} autoComplete="name" minLength={2} required />
          </label>
          <label>
            <span>Phone number</span>
            <input type="tel" value={phoneNumber} onChange={(event) => { setPhoneNumber(event.target.value); setErrorMessage(''); }} autoComplete="tel" required />
          </label>
        </div>
        <label>
          <span>Email account</span>
          <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrorMessage(''); }} autoComplete="email" required />
        </label>
        <label>
          <span>Password</span>
          <div className="admin-auth-password-field">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setErrorMessage(''); }} autoComplete="new-password" required />
            <button type="button" className="admin-auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </label>
        <ul className="admin-password-rules" aria-label="Password requirements">
          {requirements.map((requirement) => (
            <li key={requirement.label} className={requirement.valid ? 'is-valid' : ''}>
              <CheckCircle2 /> {requirement.label}
            </li>
          ))}
        </ul>
        <Button type="submit" variant="glow" size="md" className="admin-auth-primary" icon={<UserPlus />} disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Admin Account'}
        </Button>
        <button type="button" className="admin-auth-link" onClick={onLogin}>Already have an account? Sign in</button>
      </form>
    </>
  );
};
