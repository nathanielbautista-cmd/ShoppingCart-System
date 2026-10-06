import './AdminSettings.css';
import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { Check, Volume2, Scale, Store, Moon, Sun } from 'lucide-react';
import { Button } from '../../components/Button';

export const AdminSettings: React.FC = () => {
  const { settings, updateSettings, playVoice } = useCart();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [currency, setCurrency] = useState(settings.currency);
  const [budgetWarningThreshold, setBudgetWarningThreshold] = useState(
    settings.budgetWarningThreshold.toString()
  );
  const [weightToleranceGrams, setWeightToleranceGrams] = useState(
    settings.weightToleranceGrams.toString()
  );
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled);
  const [theme, setTheme] = useState(settings.theme);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName.trim() || 'Metro Supermarket',
      currency: currency.trim() || 'PHP',
      currencySymbol: currencySymbol.trim() || '₱',
      budgetWarningThreshold: parseInt(budgetWarningThreshold, 10) || 80,
      weightToleranceGrams: parseInt(weightToleranceGrams, 10) || 15,
      voiceEnabled,
      theme,
    });

    setSavedNotice(true);
    playVoice('Settings saved successfully');
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="admin-settings__item-1">
      {/* Header */}
      <div className="admin-settings__item-2">
        <h2 className="admin-settings__item-3">Settings</h2>
      </div>

      {savedNotice && (
        <div className="admin-settings__item-4">
          <Check className="admin-settings__item-5" />
          <span>Configuration updated successfully!</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="admin-settings__item-6">
        {/* Store & Currency */}
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

        {/* Budget & Weight Thresholds */}
        <div className="admin-settings__item-18">
          <h3 className="admin-settings__item-19">
            <Scale className="admin-settings__item-20" />
            <span>Sensor & Budget Thresholds</span>
          </h3>

          <div className="admin-settings__item-21">
            <div>
              <label className="admin-settings__item-22">
                Budget Warning Threshold (%)
              </label>
              <div className="admin-settings__item-23">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={budgetWarningThreshold}
                  onChange={(e) => setBudgetWarningThreshold(e.target.value)}
                  className="admin-settings__item-24"
                />
                <span className="admin-settings__item-25">%</span>
              </div>
            </div>

            <div>
              <label className="admin-settings__item-26">
                HX711 Weight Tolerance (± grams)
              </label>
              <div className="admin-settings__item-27">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={weightToleranceGrams}
                  onChange={(e) => setWeightToleranceGrams(e.target.value)}
                  className="admin-settings__item-28"
                />
                <span className="admin-settings__item-29">g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Assistant Toggle */}
        <div className="admin-settings__item-30">
          <div className="admin-settings__item-31">
            <div className="admin-settings__item-32">
              <Volume2 className="admin-settings__item-33" />
            </div>
            <div>
              <div className="admin-settings__item-34">Voice Assistance (TTS)</div>
            </div>
          </div>

          <label className="admin-settings__item-35">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="admin-settings__item-36"
            />
            <div className="admin-settings__item-37"></div>
          </label>
        </div>

        {/* Appearance */}
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
            <button type="button" onClick={() => setTheme('LIGHT')} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${theme === 'LIGHT' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}><Sun className="admin-settings__item-44" />White</button>
            <button type="button" onClick={() => setTheme('DARK')} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${theme === 'DARK' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}><Moon className="admin-settings__item-45" />Dark</button>
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
