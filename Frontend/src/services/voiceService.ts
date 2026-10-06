/**
 * Voice Assistance Service for iCart
 *
 * HARDWARE TARGET:
 * Raspberry Pi 3.5mm audio jack / USB audio speaker using text-to-speech
 * (e.g., eSpeak, pyttsx3, or Piper TTS offline engine).
 *
 * NOTE:
 * Hardware/OS audio routing will be hooked up in the deployment phase.
 * In this frontend layer, it dispatches speech prompts, supports browser TTS
 * where available, and provides visual voice assistant updates.
 */

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

    // Optional frontend speech synthesis (browser-native TTS fallback)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop prior utterances
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
