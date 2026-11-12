import './AdminSettings.css';
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import {
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Moon,
  Store,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../../components/Button';

const MAX_LOGO_SIZE_BYTES = 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const AdminSettings: React.FC = () => {
  const { settings, updateSettings } = useCart();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeLogo, setStoreLogo] = useState(settings.storeLogo);
  const [logoError, setLogoError] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [currency, setCurrency] = useState(settings.currency);
  const [theme, setTheme] = useState(settings.theme);
  const [savedNotice, setSavedNotice] = useState(false);

  const selectTheme = (nextTheme: 'LIGHT' | 'DARK') => {
    setTheme(nextTheme);
    updateSettings({ theme: nextTheme });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setLogoError('Please upload a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoError('Logo must be 1 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setLogoError('Unable to read the selected image.');
        return;
      }
      setStoreLogo(reader.result);
      setLogoError('');
    };
    reader.onerror = () => setLogoError('Unable to read the selected image.');
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName.trim() || 'Metro Supermarket',
      storeLogo,
      currency: currency.trim() || 'PHP',
      currencySymbol: currencySymbol.trim() || '₱',
      theme,
    });

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 4000);
  };

  return (
    <div className="admin-settings__item-1">

      <div className="admin-settings__item-2">
        <h2 className="admin-settings__item-3">Settings</h2>
      </div>

      {savedNotice && (
        <div
          className="admin-settings__item-4"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <CheckCircle2 className="admin-settings__item-5" />
          <div>
            <strong>Settings saved successfully!</strong>
            <span>Configuration updated successfully.</span>
          </div>
        </div>
      )}


      <form onSubmit={handleSave} className="admin-settings__item-6">

        <div className="admin-settings__item-7">
          <h3 className="admin-settings__item-8">
            <Store className="admin-settings__item-9" />
            <span>Store Profile</span>
          </h3>

          <div className="admin-settings__item-10">
            <div>
              <label className="admin-settings__item-11">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="admin-settings__item-12"
              />

              <div className="admin-settings__logo-field">
                <span className="admin-settings__logo-label">Store Logo</span>
                <div className="admin-settings__logo-control">
                  <div className={`admin-settings__logo-preview ${storeLogo ? 'has-store-logo' : ''}`}>
                    {storeLogo ? (
                      <img src={storeLogo} alt="Store logo preview" />
                    ) : (
                      <ImageIcon aria-hidden="true" />
                    )}
                  </div>
                  <div className="admin-settings__logo-actions">
                    <div>
                      <label className="admin-settings__logo-upload">
                        <Upload aria-hidden="true" />
                        <span>{storeLogo ? 'Change Logo' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {storeLogo && (
                        <button
                          type="button"
                          className="admin-settings__logo-remove"
                          onClick={() => {
                            setStoreLogo('');
                            setLogoError('');
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                          Remove
                        </button>
                      )}
                    </div>
                    {logoError && <span className="admin-settings__logo-error" role="alert">{logoError}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-settings__item-13">
              <div>
                <label className="admin-settings__item-14">Currency Code</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="admin-settings__item-15"
                  placeholder="PHP"
                />
              </div>
              <div>
                <label className="admin-settings__item-16">Symbol</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="admin-settings__item-17"
                  placeholder="₱"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-settings__item-38">
          <div className="admin-settings__item-39">
            <div className="admin-settings__item-40">
              <Sun className="admin-settings__item-41" />
            </div>
            <div>
              <div className="admin-settings__item-42">Display Theme</div>
            </div>
          </div>
          <div className="admin-settings__item-43">
            <button type="button" onClick={() => selectTheme('LIGHT')} aria-pressed={theme === 'LIGHT'} className={`admin-settings__theme-button ${theme === 'LIGHT' ? 'is-active' : ''}`}><Sun className="admin-settings__item-44" />White</button>
            <button type="button" onClick={() => selectTheme('DARK')} aria-pressed={theme === 'DARK'} className={`admin-settings__theme-button ${theme === 'DARK' ? 'is-active' : ''}`}><Moon className="admin-settings__item-45" />Dark</button>
          </div>
        </div>

        <div className="admin-settings__item-46">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Check className="admin-settings__item-47" />}
          >
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
