import './AdminCashiers.css';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  CashierAccount,
  createCashierAccount,
  getCashierAccounts,
} from '../../services/adminService';

const initialForm = { name: '', email: '', phoneNumber: '', password: '' };

export const AdminCashiers: React.FC = () => {
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const passwordRequirements = useMemo(() => [
    { label: '8+ characters', valid: form.password.length >= 8 },
    { label: 'Upper & lowercase', valid: /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) },
    { label: 'One number', valid: /\d/.test(form.password) },
    { label: 'One special character', valid: /[^A-Za-z0-9]/.test(form.password) },
  ], [form.password]);

  const loadCashiers = async () => {
    setIsLoading(true);
    try {
      const response = await getCashierAccounts();
      setCashiers(response.cashiers || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to load cashier accounts.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCashiers();
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!passwordRequirements.every((requirement) => requirement.valid)) {
      setMessage({ type: 'error', text: 'Please complete every password requirement.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createCashierAccount(form);
      setCashiers((current) => [response.cashier, ...current]);
      setForm(initialForm);
      setShowPassword(false);
      setMessage({ type: 'success', text: `${response.cashier.name}'s cashier account is ready to use.` });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to create the cashier account.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-cashiers">
      <header className="admin-cashiers__header">
        <div>
          <span className="admin-cashiers__eyebrow"><ShieldCheck /> Staff access</span>
          <h1>Cashier Accounts</h1>
        </div>
        <div className="admin-cashiers__count"><Users /><strong>{cashiers.length}</strong><span>Total cashiers</span></div>
      </header>

      {message && (
        <div className={`admin-cashiers__message admin-cashiers__message--${message.type}`} role="alert">
          {message.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="admin-cashiers__grid">
        <section className="admin-cashiers__panel admin-cashiers__create" aria-labelledby="create-cashier-title">
          <div className="admin-cashiers__section-heading">
            <span><UserPlus /></span>
            <div><h2 id="create-cashier-title">Create cashier account</h2></div>
          </div>

          <form onSubmit={handleSubmit} className="admin-cashiers__form">
            <label>
              <span>Full name</span>
              <input type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} minLength={2} maxLength={100} autoComplete="name" required />
            </label>
            <label>
              <span>Phone number</span>
              <input type="tel" value={form.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value)} autoComplete="tel" required />
            </label>
            <label className="admin-cashiers__wide">
              <span>Email address</span>
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" required />
            </label>
            <label className="admin-cashiers__wide">
              <span> Password</span>
              <div className="admin-cashiers__password">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} autoComplete="new-password" maxLength={128} required />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            <ul className="admin-cashiers__requirements admin-cashiers__wide" aria-label="Password requirements">
              {passwordRequirements.map((requirement) => (
                <li key={requirement.label} className={requirement.valid ? 'is-valid' : ''}><CheckCircle2 />{requirement.label}</li>
              ))}
            </ul>
            <button className="admin-cashiers__submit admin-cashiers__wide" type="submit" disabled={isSubmitting}>
              <UserPlus />{isSubmitting ? 'Creating account...' : 'Create cashier account'}
            </button>
          </form>
        </section>

        <section className="admin-cashiers__panel admin-cashiers__list" aria-labelledby="cashier-list-title">
          <div className="admin-cashiers__section-heading admin-cashiers__section-heading--list">
            <span><Users /></span>
            <div><h2 id="cashier-list-title">Registered cashiers</h2></div>
            <button type="button" onClick={() => void loadCashiers()} disabled={isLoading} aria-label="Refresh cashier accounts" title="Refresh">
              <RefreshCw className={isLoading ? 'is-spinning' : ''} />
            </button>
          </div>

          <div className="admin-cashiers__accounts">
            {isLoading ? (
              <div className="admin-cashiers__empty"><RefreshCw className="is-spinning" /><span>Loading cashier accounts...</span></div>
            ) : cashiers.length === 0 ? (
              <div className="admin-cashiers__empty"><Users /><strong>No cashier accounts yet</strong><span>Create the first account using the form.</span></div>
            ) : cashiers.map((cashier) => (
              <article className="admin-cashiers__account" key={cashier.id}>
                <div className="admin-cashiers__avatar" aria-hidden="true">
                  {cashier.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                </div>
                <div className="admin-cashiers__account-info">
                  <div><h3>{cashier.name}</h3><span><ShieldCheck /> Cashier</span></div>
                  <p><Mail />{cashier.email}</p>
                  <p><Phone />{cashier.phoneNumber}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
