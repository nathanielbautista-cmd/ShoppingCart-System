











class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private alarmIntervalId: number | null = null;
  private alarmOscillators = new Set<OscillatorNode>();

  constructor() {
    if (typeof window === 'undefined') return;

    // Browsers only allow audio after a user gesture. Prepare the kiosk audio
    // output on the first tap/key press so a later safety alarm is audible.
    const unlockAudio = () => {
      this.getContext();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stopAlarm();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }




  public playScanBeep() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2350, ctx.currentTime);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {

    }
  }




  public playSuccessChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.09);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.1);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.28);
    } catch {

    }
  }




  public playWarning() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.1);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {

    }
  }

  private playAlarmBurst() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.18);
      osc.frequency.setValueAtTime(880, now + 0.36);
      osc.frequency.setValueAtTime(660, now + 0.54);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.setValueAtTime(0.24, now + 0.68);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.74);

      osc.connect(gain);
      gain.connect(ctx.destination);
      this.alarmOscillators.add(osc);
      osc.addEventListener('ended', () => this.alarmOscillators.delete(osc), { once: true });
      osc.start(now);
      osc.stop(now + 0.75);
    } catch {
      // The visual alert remains available if kiosk audio is unavailable.
    }
  }

  public startAlarm() {
    if (this.isMuted || this.alarmIntervalId !== null) return;
    this.playAlarmBurst();
    this.alarmIntervalId = window.setInterval(() => this.playAlarmBurst(), 950);
  }

  public stopAlarm() {
    if (this.alarmIntervalId !== null) {
      window.clearInterval(this.alarmIntervalId);
      this.alarmIntervalId = null;
    }
    this.alarmOscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // It may already have stopped naturally.
      }
    });
    this.alarmOscillators.clear();
  }




  public playKeyClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {

    }
  }
}

export const soundService = new SoundService();
