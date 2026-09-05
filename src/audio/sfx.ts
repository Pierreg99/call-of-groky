/**
 * Procedural WebAudio SFX — richer Loop 4 synth (layered noise + tones).
 * No external sample downloads required (license-clean by construction).
 */

type SfxKind = 'gunshot' | 'reload' | 'footstep' | 'hit' | 'death' | 'enemyShot' | 'ads' | 'kill';

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private footstepCool = 0;
  private listenerPos = { x: 0, y: 0, z: 0 };

  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.48;
    this.master.connect(this.ctx.destination);
  }

  setListener(x: number, y: number, z: number): void {
    this.listenerPos = { x, y, z };
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  play(kind: SfxKind, world?: { x: number; y: number; z: number }): void {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx!;
    const master = this.master!;
    const now = ctx.currentTime;

    let pan = 0;
    let distGain = 1;
    if (world) {
      const dx = world.x - this.listenerPos.x;
      const dz = world.z - this.listenerPos.z;
      const dist = Math.hypot(dx, world.y - this.listenerPos.y, dz);
      distGain = Math.max(0.05, 1 / (1 + dist * 0.12));
      pan = Math.max(-1, Math.min(1, dx / Math.max(1, dist)));
    }

    const out = ctx.createGain();
    out.gain.value = distGain;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    out.connect(panner);
    panner.connect(master);

    switch (kind) {
      case 'gunshot':
        this.noiseBurst(ctx, out, now, 0.07, 1400, 0.55);
        this.noiseBurst(ctx, out, now, 0.11, 500, 0.4);
        this.tone(ctx, out, now, 220, 0.045, 'square', 0.22);
        this.tone(ctx, out, now, 95, 0.09, 'sawtooth', 0.18);
        this.tone(ctx, out, now + 0.01, 55, 0.12, 'sine', 0.2);
        break;
      case 'enemyShot':
        this.noiseBurst(ctx, out, now, 0.06, 800, 0.4);
        this.tone(ctx, out, now, 150, 0.04, 'square', 0.16);
        this.tone(ctx, out, now, 70, 0.07, 'sine', 0.12);
        break;
      case 'reload':
        this.tone(ctx, out, now, 440, 0.035, 'triangle', 0.18);
        this.noiseBurst(ctx, out, now + 0.08, 0.03, 2500, 0.15);
        this.tone(ctx, out, now + 0.14, 260, 0.06, 'triangle', 0.16);
        this.tone(ctx, out, now + 0.55, 560, 0.05, 'sine', 0.2);
        this.noiseBurst(ctx, out, now + 0.5, 0.04, 2000, 0.18);
        break;
      case 'footstep':
        this.noiseBurst(ctx, out, now, 0.03, 380, 0.16);
        this.tone(ctx, out, now, 65, 0.028, 'sine', 0.07);
        break;
      case 'hit':
        this.tone(ctx, out, now, 920, 0.035, 'square', 0.18);
        this.noiseBurst(ctx, out, now, 0.028, 3200, 0.22);
        this.tone(ctx, out, now, 180, 0.05, 'sine', 0.1);
        break;
      case 'death':
        this.tone(ctx, out, now, 240, 0.22, 'sawtooth', 0.28);
        this.tone(ctx, out, now + 0.04, 100, 0.32, 'sine', 0.22);
        this.noiseBurst(ctx, out, now, 0.22, 550, 0.32);
        break;
      case 'kill':
        this.tone(ctx, out, now, 520, 0.06, 'square', 0.2);
        this.tone(ctx, out, now + 0.05, 780, 0.08, 'triangle', 0.18);
        this.noiseBurst(ctx, out, now, 0.05, 1800, 0.15);
        break;
      case 'ads':
        this.tone(ctx, out, now, 640, 0.03, 'sine', 0.12);
        break;
    }
  }

  updateFootsteps(dt: number, moving: boolean, sprinting: boolean, grounded: boolean): void {
    if (!moving || !grounded) {
      this.footstepCool = Math.max(0, this.footstepCool - dt);
      return;
    }
    this.footstepCool -= dt;
    const interval = sprinting ? 0.28 : 0.42;
    if (this.footstepCool <= 0) {
      this.footstepCool = interval;
      this.play('footstep');
    }
  }

  private tone(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.55), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    dur: number,
    cutoff: number,
    gain: number,
  ): void {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // Slightly pink-ish: weight low freqs
      const white = Math.random() * 2 - 1;
      data[i] = white * (1 - (i / len) * 0.35);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff * 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(lp);
    lp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const gameAudio = new GameAudio();
