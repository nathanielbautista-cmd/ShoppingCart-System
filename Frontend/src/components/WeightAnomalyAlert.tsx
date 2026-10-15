import React, { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, Scale } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { soundService } from '../services/soundService';
import { setHardwareAlarm } from '../services/hardwareService';
import './WeightAnomalyAlert.css';

const ALARM_DELAY_SECONDS = 10;

export const WeightAnomalyAlert: React.FC = () => {
  const { weightAnomaly, playVoice } = useCart();
  const [secondsUntilAlarm, setSecondsUntilAlarm] = useState(ALARM_DELAY_SECONDS);
  const [alarmActive, setAlarmActive] = useState(false);

  const isIncrease = weightAnomaly?.direction === 'increase';

  useEffect(() => {
    soundService.stopAlarm();
    void setHardwareAlarm(false).catch(() => undefined);
    setAlarmActive(false);
    setSecondsUntilAlarm(ALARM_DELAY_SECONDS);

    if (!isIncrease) return;

    const startedAt = Date.now();
    const countdownId = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setSecondsUntilAlarm(Math.max(0, ALARM_DELAY_SECONDS - elapsedSeconds));
    }, 250);
    const alarmTimeoutId = window.setTimeout(() => {
      window.clearInterval(countdownId);
      setSecondsUntilAlarm(0);
      setAlarmActive(true);
      soundService.startAlarm();
      void setHardwareAlarm(true).catch(() => undefined);
      playVoice('Security alert. Remove the unscanned item from the basket now.');
    }, ALARM_DELAY_SECONDS * 1000);

    return () => {
      window.clearInterval(countdownId);
      window.clearTimeout(alarmTimeoutId);
      soundService.stopAlarm();
      void setHardwareAlarm(false).catch(() => undefined);
    };
  }, [isIncrease, playVoice]);

  if (!weightAnomaly) return null;

  const statusMessage = isIncrease
    ? alarmActive
      ? 'ALARM ACTIVE — remove the item to stop it.'
      : `Remove it within ${secondsUntilAlarm} second${secondsUntilAlarm === 1 ? '' : 's'} to prevent the alarm.`
    : 'Return it to the basket, then use My Cart when products have similar weights.';

  return (
    <div className={`weight-anomaly${alarmActive ? ' weight-anomaly--alarming' : ''}`} role="alert" aria-live="assertive">
      {alarmActive
        ? <BellRing className="weight-anomaly__icon weight-anomaly__bell" />
        : <AlertTriangle className="weight-anomaly__icon" />}
      <div className="weight-anomaly__message">
        <strong>{isIncrease ? 'Unscanned item detected' : 'Removed item could not be identified'}</strong>
        <span>{statusMessage}</span>
      </div>
      <div className="weight-anomaly__reading">
        <Scale />
        <strong>{isIncrease ? '+' : '-'}{weightAnomaly.changeGrams.toFixed(1)} g</strong>
      </div>
    </div>
  );
};
