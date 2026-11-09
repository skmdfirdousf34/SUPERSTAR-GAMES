/**
 * Procedural Web Audio API Engine for Aviator
 * Synthesizes engine acceleration, chimes, explosions, and clicks without external audio files.
 */
export class AviatorSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private flightOsc: OscillatorNode | null = null;
  private flightGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.5;

  private ensureContext(): boolean {
    if (this.ctx) return true;
    if (typeof window === "undefined") return false;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  public get isMuted(): boolean {
    return this.muted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, gainValue: number, startTime?: number): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain || this.muted) return;
    const ctx = this.ctx;
    const t = startTime ?? ctx.currentTime;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(gainValue, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // Audio node scheduling guard
    }
  }

  private playNoise(duration: number, gainValue: number, filterFreq: number, startTime?: number): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain || this.muted) return;
    const ctx = this.ctx;
    const t = startTime ?? ctx.currentTime;
    const sampleCount = Math.ceil(ctx.sampleRate * duration);

    try {
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterFreq, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainValue, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(t);
      source.stop(t + duration);
    } catch {
      // Noise buffer guard
    }
  }

  public tick(): void {
    this.playTone(1200, "square", 0.04, 0.06);
  }

  public buttonClick(): void {
    this.playTone(800, "square", 0.03, 0.05);
  }

  public flightStart(): void {
    if (!this.ensureContext() || !this.ctx || this.muted) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    const ctx = this.ctx;
    const t = ctx.currentTime;

    this.playTone(150, "sine", 0.3, 0.12, t);
    this.playTone(200, "sine", 0.3, 0.08, t + 0.05);
    this.playTone(300, "sine", 0.2, 0.06, t + 0.1);

    this.startFlightOsc();
  }

  private startFlightOsc(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain || this.muted) return;
    this.stopFlightOsc();

    try {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();

      this.flightOsc = osc;
      this.flightGain = gain;
    } catch {
      // Flight osc guard
    }
  }

  public stopFlightOsc(): void {
    if (this.flightOsc) {
      try {
        this.flightOsc.stop();
        this.flightOsc.disconnect();
      } catch {
        // already stopped
      }
      this.flightOsc = null;
    }
    if (this.flightGain) {
      try {
        this.flightGain.disconnect();
      } catch {}
      this.flightGain = null;
    }
  }

  public updateMultiplier(multiplier: number): void {
    if (!this.flightOsc || !this.ctx || !this.flightGain || this.muted) return;

    try {
      const freq = 220 + Math.min(multiplier, 100) * 12;
      const maxVol = Math.min(0.05 + multiplier * 0.002, 0.18);

      this.flightOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.flightGain.gain.setTargetAtTime(maxVol, this.ctx.currentTime, 0.05);
    } catch {}
  }

  public cashout(): void {
    if (!this.ensureContext() || !this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    this.stopFlightOsc();

    const freqs = [880, 1100, 1320, 1760];
    for (let i = 0; i < freqs.length; i++) {
      this.playTone(freqs[i], "sine", 0.4 - i * 0.05, 0.15, t + i * 0.06);
    }
  }

  public crash(): void {
    if (!this.ensureContext() || !this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    this.stopFlightOsc();

    this.playNoise(0.6, 0.25, 3000, t);
    this.playTone(60, "sine", 0.5, 0.3, t);
    this.playTone(40, "sine", 0.7, 0.2, t + 0.05);
    this.playNoise(0.3, 0.1, 800, t + 0.1);
  }

  public dispose(): void {
    this.stopFlightOsc();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}
