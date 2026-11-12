type VoiceListener = (message: string) => void;

const NATURAL_VOICE_NAMES = /natural|neural|premium|enhanced|google|microsoft|samantha|ava|aria|jenny|zira|karen|serena/i;
const ROBOTIC_VOICE_NAMES = /espeak|festival/i;

class VoiceService {
  private listeners: VoiceListener[] = [];
  private lastSpokenMessage = '';
  private browserVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.loadBrowserVoices();
    window.speechSynthesis.addEventListener('voiceschanged', this.loadBrowserVoices);
  }

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  public speakMessage(message: string): void {
    this.lastSpokenMessage = message;
    this.notify(message);
    if (!message.trim()) return;
    void this.speakThroughKiosk(message.trim());
  }

  public speak(message: string): void {
    this.speakMessage(message);
  }

  public getLastMessage(): string {
    return this.lastSpokenMessage;
  }

  private loadBrowserVoices = () => {
    this.browserVoices = window.speechSynthesis.getVoices();
  };

  private selectNaturalVoice(): SpeechSynthesisVoice | undefined {
    const requested = 'en-us';
    const score = (voice: SpeechSynthesisVoice) => {
      const voiceLanguage = voice.lang.toLowerCase();
      let value = 0;
      if (voiceLanguage === requested) value += 120;
      else if (voiceLanguage === 'en' || voiceLanguage.startsWith('en-')) value += 70;
      if (NATURAL_VOICE_NAMES.test(voice.name)) value += 80;
      if (voice.localService) value += 10;
      if (voice.default) value += 5;
      if (ROBOTIC_VOICE_NAMES.test(voice.name)) value -= 100;
      return value;
    };
    const matchingVoices = this.browserVoices.filter((voice) => {
      const voiceLanguage = voice.lang.toLowerCase();
      return voiceLanguage === requested || voiceLanguage === 'en' || voiceLanguage.startsWith('en-');
    });
    return [...matchingVoices].sort((left, right) => score(right) - score(left))[0];
  }

  private async speakThroughKiosk(message: string): Promise<void> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1800);
    try {
      const response = await fetch('/api/hardware/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      if (response.ok) return;
    } catch {
      // Development machines and older deployments may not expose Pi audio.
    } finally {
      window.clearTimeout(timeout);
    }
    this.speakInBrowser(message);
  }

  private speakInBrowser(message: string): void {
    if (!('speechSynthesis' in window)) return;
    try {
      const speech = window.speechSynthesis;
      speech.cancel();
      speech.resume();
      const utterance = new SpeechSynthesisUtterance(message);
      const voice = this.selectNaturalVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'en-US';
      }
      utterance.rate = 0.94;
      utterance.pitch = 1;
      utterance.volume = 1;
      speech.speak(utterance);
    } catch (error) {
      console.warn('Speech synthesis is unavailable or blocked:', error);
    }
  }

  private notify(message: string): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in voice listener:', error);
      }
    });
  }
}

export const voiceService = new VoiceService();

export function speakMessage(message: string): void {
  voiceService.speakMessage(message);
}
