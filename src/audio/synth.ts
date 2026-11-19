export type SoundEvent =
  | 'PULSE'
  | 'NOVA'
  | 'CHAIN'
  | 'SHIELD_BREAK'
  | 'KILL'
  | 'BUILD'
  | 'SELL'
  | 'SWAP'
  | 'INVALID'
  | 'WAVE_START'
  | 'WAVE_CLEAR'
  | 'BREACH'
  | 'VICTORY'
  | 'GAME_OVER';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastPlayed = new Map<SoundEvent, number>();

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    ctx: AudioContext,
    type: OscillatorType,
    startFreq: number,
    endFreq: number | null,
    stepFreqAt: { freq: number; delay: number } | null,
    peakGain: number,
    startTime: number,
    rampDuration: number,
    stopDuration: number
  ): void {
    const safeGain = Math.max(0.001, Math.min(0.4, peakGain));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + rampDuration);
    } else if (stepFreqAt) {
      osc.frequency.setValueAtTime(Math.max(20, stepFreqAt.freq), startTime + stepFreqAt.delay);
    }
    gain.gain.setValueAtTime(safeGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + rampDuration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };
    osc.start(startTime);
    osc.stop(startTime + stopDuration);
  }

  public play(event: SoundEvent, volumeScale = 1): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx || ctx.state === 'closed') return;

      const nowMs = performance.now();
      const minInterval =
        event === 'PULSE' || event === 'CHAIN'
          ? 55
          : event === 'KILL'
          ? 45
          : event === 'NOVA'
          ? 90
          : 20;

      const prev = this.lastPlayed.get(event) ?? 0;
      if (nowMs - prev < minInterval) return;
      this.lastPlayed.set(event, nowMs);

      const t = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
      const vol = Number.isFinite(volumeScale) ? Math.max(0.05, Math.min(1.5, volumeScale)) : 1;

      switch (event) {
        case 'PULSE':
          this.playTone(ctx, 'triangle', 520 + Math.random() * 80, 160, null, 0.055 * vol, t, 0.07, 0.075);
          break;
        case 'NOVA':
          this.playTone(ctx, 'sine', 190, 54, null, 0.11 * vol, t, 0.23, 0.24);
          break;
        case 'CHAIN':
          this.playTone(ctx, 'sawtooth', 880, 340, null, 0.04 * vol, t, 0.065, 0.07);
          break;
        case 'SHIELD_BREAK':
          this.playTone(ctx, 'sine', 1180, 420, null, 0.08 * vol, t, 0.15, 0.16);
          break;
        case 'KILL':
          this.playTone(ctx, 'sine', 320 + Math.random() * 90, 640, null, 0.055 * vol, t, 0.08, 0.085);
          break;
        case 'BUILD':
          this.playTone(ctx, 'triangle', 280, null, { freq: 420, delay: 0.045 }, 0.09, t, 0.12, 0.13);
          break;
        case 'SELL':
          this.playTone(ctx, 'triangle', 460, 240, null, 0.08, t, 0.12, 0.13);
          break;
        case 'SWAP':
          this.playTone(ctx, 'sine', 520, null, { freq: 660, delay: 0.035 }, 0.06, t, 0.08, 0.09);
          break;
        case 'INVALID':
          this.playTone(ctx, 'sawtooth', 140, null, { freq: 115, delay: 0.06 }, 0.075, t, 0.14, 0.15);
          break;
        case 'WAVE_START':
          [330, 440, 554].forEach((freq, i) => {
            this.playTone(ctx, 'triangle', freq, null, null, 0.07, t + i * 0.055, 0.22, 0.24);
          });
          break;
        case 'WAVE_CLEAR':
          [440, 554, 659].forEach((freq, i) => {
            this.playTone(ctx, 'sine', freq, null, null, 0.07, t + i * 0.065, 0.25, 0.26);
          });
          break;
        case 'BREACH':
          this.playTone(ctx, 'sawtooth', 150, 48, null, 0.14, t, 0.28, 0.29);
          break;
        case 'VICTORY':
          [392, 493.88, 587.33, 783.99].forEach((freq, i) => {
            this.playTone(ctx, 'triangle', freq, null, null, 0.08, t + i * 0.09, 0.45, 0.48);
          });
          break;
        case 'GAME_OVER':
          [240, 200, 155].forEach((freq, i) => {
            this.playTone(ctx, 'sawtooth', freq, null, null, 0.07, t + i * 0.14, 0.35, 0.37);
          });
          break;
      }
    } catch {
      // Never allow Web Audio errors to interrupt gameplay or the render loop
    }
  }
}

export const soundEngine = new SoundEngine();
