import './VoiceAssistant.css';
import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, RotateCcw } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { voiceService } from '../services/voiceService';
import { soundService } from '../services/soundService';

interface VoiceAssistantProps {
  compact?: boolean;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ compact = false }) => {
  const { settings, toggleVoice } = useCart();
  const [currentMessage, setCurrentMessage] = useState<string>(
    voiceService.getLastMessage() || 'Voice Assistant active.'
  );
  const [isSpeakingAnimation, setIsSpeakingAnimation] = useState(false);

  useEffect(() => {
    const unsubscribe = voiceService.subscribe((msg) => {
      setCurrentMessage(msg);
      setIsSpeakingAnimation(true);
      const timer = setTimeout(() => {
        setIsSpeakingAnimation(false);
      }, 3500);
      return () => clearTimeout(timer);
    });
    return unsubscribe;
  }, []);

  const handleToggle = () => {
    soundService.playKeyClick();
    toggleVoice();
  };

  const handleReplay = () => {
    soundService.playKeyClick();
    voiceService.speak(currentMessage, true);
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        title={settings.voiceEnabled ? 'Mute Voice Assistant' : 'Unmute Voice Assistant'}
        className={`voice-assistant__compact voice-assistant__compact--${settings.voiceEnabled ? 'enabled' : 'muted'}`}
      >
        {settings.voiceEnabled ? (
          <>
            <Volume2 className={`voice-assistant__compact-icon ${isSpeakingAnimation ? 'voice-assistant__icon--speaking' : ''}`} />
            <span className="voice-assistant__compact-label">Voice ON</span>
          </>
        ) : (
          <>
            <VolumeX className="voice-assistant__compact-icon voice-assistant__compact-icon--muted" />
            <span className="voice-assistant__compact-label">MUTE</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      className={`voice-assistant voice-assistant--${settings.voiceEnabled ? 'enabled' : 'muted'}`}
    >
      <div className="voice-assistant__details">
        <div
          className="voice-assistant__icon-wrap"
        >
          <Volume2 className={`voice-assistant__main-icon ${isSpeakingAnimation ? 'voice-assistant__icon--speaking' : ''}`} />
        </div>
        <div className="voice-assistant__message-wrap">
          <div className="voice-assistant__heading">
            <span>🔊 Voice Assistant</span>
            <span className="voice-assistant__state">
              {settings.voiceEnabled ? 'VOICE ACTIVE' : 'MUTED'}
            </span>
          </div>
          <div className="voice-assistant__message">
            &ldquo;{currentMessage}&rdquo;
          </div>
        </div>
      </div>

      <div className="voice-assistant__actions">
        <button
          onClick={handleReplay}
          title="Replay Voice Prompt"
          className="voice-assistant__replay-button"
        >
          <RotateCcw className="voice-assistant__action-icon" />
        </button>

        <button
          onClick={handleToggle}
          aria-label={settings.voiceEnabled ? 'Mute Voice' : 'Enable Voice'}
          className="voice-assistant__toggle-button"
        >
          {settings.voiceEnabled ? 'MUTE' : 'UNMUTE'}
        </button>
      </div>
    </div>
  );
};
