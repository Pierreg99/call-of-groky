/**
 * Procedural WebAudio SFX — no asset downloads.
 * Spatial-ish via stereo panning + distance gain when a listener pose is set.
 */

type SfxKind = 'gunshot' | 'reload' | 'footstep' | 'hit' | 'death' | 'enemyShot' | 'ads';

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
    this.master.gain.value = 0.45;
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
        this.noiseBurst(ctx, out, now, 0.09, 900, 0.7);
        this.tone(ctx, out, now, 180, 0.05, 'square', 0.25);
        this.tone(ctx, out, now, 90, 0.08, 'sawtooth', 0.15);
        break;
      case 'enemyShot':
        this.noiseBurst(ctx, out, now, 0.07, 700, 0.45);
        this.tone(ctx, out, now, 140, 0.04, 'square', 0.18);
        break;
      case 'reload':
        this.tone(ctx, out, now, 420, 0.04, 'triangle', 0.2);
        this.tone(ctx, out, now + 0.12, 280, 0.06, 'triangle', 0.18);
        this.tone(ctx, out, now + 0.55, 520, 0.05, 'sine', 0.22);
        this.noiseBurst(ctx, out, now + 0.5, 0.04, 2000, 0.2);
        break;
      case 'footstep':
        this.noiseBurst(ctx, out, now, 0.035, 400, 0.18);
        this.tone(ctx, out, now, 70, 0.03, 'sine', 0.08);
        break;
      case 'hit':
        this.tone(ctx, out, now, 880, 0.04, 'square', 0.2);
        this.noiseBurst(ctx, out, now, 0.03, 3000, 0.25);
        break;
      case 'death':
        this.tone(ctx, out, now, 220, 0.25, 'sawtooth', 0.3);
        this.tone(ctx, out, now + 0.05, 110, 0.35, 'sine', 0.25);
        this.noiseBurst(ctx, out, now, 0.2, 600, 0.35);
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
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const gameAudio = new GameAudio();
