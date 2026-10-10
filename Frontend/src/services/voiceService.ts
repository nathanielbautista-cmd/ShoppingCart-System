












type VoiceListener = (message: string) => void;

class VoiceService {
  private listeners: VoiceListener[] = [];
  private lastSpokenMessage: string = '';

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public speakMessage(message: string, isVoiceEnabled: boolean = true): void {
    this.lastSpokenMessage = message;
    this.notify(message);

    if (!isVoiceEnabled) {
      return;
    }


    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis unavailable or blocked by browser policy:', err);
      }
    }
  }

  public speak(message: string, isVoiceEnabled: boolean = true): void {
    this.speakMessage(message, isVoiceEnabled);
  }

  public getLastMessage(): string {
    return this.lastSpokenMessage;
  }

  private notify(message: string): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in voice listener:', err);
      }
    });
  }
}

export const voiceService = new VoiceService();

export function speakMessage(message: string, isVoiceEnabled: boolean = true): void {
  voiceService.speakMessage(message, isVoiceEnabled);
}
