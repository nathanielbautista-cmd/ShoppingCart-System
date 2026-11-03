import './AdminNav.css';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  BarChart3,
  Radio,
  Settings,
  LogOut,
  ShoppingCart,
  UserRound,
  Mail,
  Phone,
  X,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { AdminScreen } from '../types';
import { AdminUser } from '../services/authService';
import { changeAdminPassword } from '../services/adminService';

const MAX_PROFILE_IMAGE_SIZE = 1024 * 1024;
const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface AdminProfileModalProps {
  admin: AdminUser;
  onClose: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ admin, onClose }) => {
  const { updateAdminProfileImage } = useCart();
  const [profileImage, setProfileImage] = useState(admin.profileImage || '');
  const [isProfileImageSaving, setIsProfileImageSaving] = useState(false);
  const [profileImageMessage, setProfileImageMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const passwordRequirements = useMemo(() => [
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'Uppercase and lowercase letters', valid: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: 'At least one number', valid: /\d/.test(newPassword) },
    { label: 'At least one special character', valid: /[^A-Za-z0-9]/.test(newPassword) },
  ], [newPassword]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const saveProfileImage = async (nextImage: string) => {
    setIsProfileImageSaving(true);
    setProfileImageMessage(null);
    try {
      await updateAdminProfileImage(nextImage);
      setProfileImage(nextImage);
      setProfileImageMessage({
        type: 'success',
        text: nextImage ? 'Profile picture updated successfully.' : 'Profile picture removed.',
      });
    } catch (error) {
      setProfileImageMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to update the profile picture.',
      });
    } finally {
      setIsProfileImageSaving(false);
    }
  };

  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!PROFILE_IMAGE_TYPES.has(file.type)) {
      setProfileImageMessage({ type: 'error', text: 'Please upload a PNG, JPG, or WebP image.' });
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setProfileImageMessage({ type: 'error', text: 'Profile picture must be 1 MB or smaller.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') void saveProfileImage(reader.result);
      else setProfileImageMessage({ type: 'error', text: 'Unable to read the selected image.' });
    };
    reader.onerror = () => setProfileImageMessage({ type: 'error', text: 'Unable to read the selected image.' });
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!passwordRequirements.every((requirement) => requirement.valid)) {
      setMessage({ type: 'error', text: 'Please complete all password requirements.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await changeAdminPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: response.message || 'Password changed successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to change password. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-profile-modal__backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-title">
        <header className="admin-profile-modal__header">
          <div>
            <h2 id="admin-profile-title">Admin profile</h2>
          </div>
          <button type="button" className="admin-profile-modal__close" onClick={onClose} aria-label="Close profile">
            <X />
          </button>
        </header>

        <div className="admin-profile-modal__body">
          <div className="admin-profile-summary">
            <div className={`admin-profile-summary__avatar ${profileImage ? 'has-profile-image' : ''}`} aria-hidden="true">
              {profileImage ? <img src={profileImage} alt="" /> : <UserRound />}
            </div>
            <div className="admin-profile-summary__identity">
              <h3>{admin.name}</h3>
              <p>{admin.username}</p>
              <div className="admin-profile-image-actions">
                <label className="admin-profile-image-upload">
                  <Upload aria-hidden="true" />
                  <span>{isProfileImageSaving ? 'Uploading...' : profileImage ? 'Change Profile' : 'Upload Profile'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleProfileImageUpload}
                    disabled={isProfileImageSaving}
                  />
                </label>
                {profileImage && (
                  <button
                    type="button"
                    className="admin-profile-image-remove"
                    onClick={() => void saveProfileImage('')}
                    disabled={isProfileImageSaving}
                    aria-label="Remove profile picture"
                    title="Remove profile picture"
                  >
                    <Trash2 />
                  </button>
                )}
              </div>
              {profileImageMessage && (
                <small className={`admin-profile-image-message admin-profile-image-message--${profileImageMessage.type}`} role="status">
                  {profileImageMessage.text}
                </small>
              )}
            </div>
          </div>

          <div className="admin-profile-details" aria-label="Admin account information">
            <div className="admin-profile-detail">
              <UserRound />
              <div><span>Full name</span><strong>{admin.name}</strong></div>
            </div>
            <div className="admin-profile-detail">
              <Mail />
              <div><span>Email address</span><strong>{admin.username}</strong></div>
            </div>
            <div className="admin-profile-detail">
              <Phone />
              <div><span>Phone number</span><strong>{admin.phoneNumber || 'Not provided'}</strong></div>
            </div>
          </div>

          <div className="admin-password-panel">
            <div className="admin-password-panel__heading">
              <div className="admin-password-panel__icon"><LockKeyhole /></div>
              <div><h3>Change password</h3></div>
            </div>

            {message && (
              <div className={`admin-profile-message admin-profile-message--${message.type}`} role="alert">
                {message.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="admin-password-form">
              <label>
                <span>Current password</span>
                <div className="admin-password-input">
                  <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setMessage(null); }} autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPasswords((visible) => !visible)} aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}>
                    {showPasswords ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </label>
              <div className="admin-password-form__row">
                <label>
                  <span>New password</span>
                  <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setMessage(null); }} autoComplete="new-password" required />
                </label>
                <label>
                  <span>Confirm new password</span>
                  <input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setMessage(null); }} autoComplete="new-password" required />
                </label>
              </div>
              <ul className="admin-password-requirements">
                {passwordRequirements.map((requirement) => (
                  <li key={requirement.label} className={requirement.valid ? 'is-valid' : ''}>
                    <CheckCircle2 /> {requirement.label}
                  </li>
                ))}
              </ul>
              <div className="admin-password-form__actions">
                <button type="button" className="admin-profile-button admin-profile-button--secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="admin-profile-button admin-profile-button--primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
};

export const AdminNav: React.FC = () => {
  const { adminScreen, setAdminScreen, logoutAdmin, settings } = useCart();

  const navItems: { screen: AdminScreen; label: string; icon: React.ReactNode }[] = [
    { screen: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="admin-nav__item-1" /> },
    { screen: 'PRODUCTS', label: 'Products', icon: <Package className="admin-nav__item-2" /> },
    { screen: 'INVENTORY', label: 'Inventory', icon: <Boxes className="admin-nav__item-3" /> },
    { screen: 'TRANSACTIONS', label: 'Transactions', icon: <Receipt className="admin-nav__item-4" /> },
    { screen: 'REPORTS', label: 'Reports', icon: <BarChart3 className="admin-nav__item-5" /> },
    { screen: 'CART_MONITORING', label: 'Carts Live', icon: <Radio className="admin-nav__item-6" /> },
    { screen: 'SETTINGS', label: 'Settings', icon: <Settings className="admin-nav__item-7" /> },
  ];

  return (
    <aside className="admin-nav">
      <div className="admin-nav__brand">
        <span className={`admin-nav__brand-mark ${settings.storeLogo ? 'has-store-logo' : ''}`}>
          {settings.storeLogo ? <img src={settings.storeLogo} alt="" /> : <ShoppingCart />}
        </span>
        <strong title={settings.storeName}>{settings.storeName}</strong>
      </div>

      <nav className="admin-nav__item-9">
        {navItems.map((item) => {
          const isActive = adminScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setAdminScreen(item.screen)}
              className={`admin-nav__link ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <span className="admin-nav__item-10">{item.icon}</span>
              <span className="admin-nav__item-11">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="admin-nav__footer">
        <button
          onClick={logoutAdmin}
          className="admin-nav__item-12"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="admin-nav__item-13" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
