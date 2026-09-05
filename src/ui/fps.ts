/** Simple on-screen FPS + rolling 1% low estimate (best-effort). */
export class FpsCounter {
  private readonly el: HTMLElement;
  private frames: number[] = [];
  private acc = 0;
  private framesThisSec = 0;
  private visible = false;
  private displayFps = 0;
  private displayOnePct = 0;

  constructor() {
    this.el = document.getElementById('fps-counter')!;
    this.el.style.display = 'none';
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** Call once per frame with dt seconds. */
  update(dt: number): void {
    this.framesThisSec += 1;
    this.acc += dt;
    if (dt > 0 && dt < 1) {
      this.frames.push(dt);
      if (this.frames.length > 300) this.frames.shift();
    }
    if (this.acc >= 0.5) {
      this.displayFps = Math.round(this.framesThisSec / this.acc);
      this.framesThisSec = 0;
      this.acc = 0;
      if (this.frames.length >= 20) {
        const sorted = [...this.frames].sort((a, b) => b - a); // longest frame first
        const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.01) - 1));
        const worst = sorted[idx] ?? sorted[0];
        this.displayOnePct = Math.round(1 / Math.max(1e-3, worst));
      }
      if (this.visible) {
        this.el.textContent = `FPS ${this.displayFps}  ·  1% ${this.displayOnePct}`;
      }
    }
  }

  snapshot(): { fps: number; onePct: number } {
    return { fps: this.displayFps, onePct: this.displayOnePct };
  }
}
