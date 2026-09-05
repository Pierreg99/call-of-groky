/** Mobile / coarse-pointer virtual controls overlay. */

export interface TouchControlHandlers {
  onMove: (right: number, forward: number) => void;
  onLook: (dx: number, dy: number) => void;
  onFire: (pressed: boolean) => void;
  onAds: (pressed: boolean) => void;
  onJump: () => void;
  onReload: () => void;
  onSprint: (pressed: boolean) => void;
  onSwitch: () => void;
  onInspect: () => void;
}

/** True when the device prefers touch / coarse pointer (show overlay). */
export function prefersTouchControls(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const noHover =
    typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
  const mtp = (navigator.maxTouchPoints ?? 0) > 0;
  const ontouch = 'ontouchstart' in window;
  return coarse || (mtp && noHover) || (ontouch && mtp);
}

export class TouchControls {
  readonly root: HTMLElement;
  private readonly handlers: TouchControlHandlers;
  private readonly stickBase: HTMLElement;
  private readonly stickKnob: HTMLElement;
  private readonly lookPad: HTMLElement;
  private readonly btnFire: HTMLButtonElement;
  private readonly btnAds: HTMLButtonElement;
  private readonly btnJump: HTMLButtonElement;
  private readonly btnReload: HTMLButtonElement;
  private readonly btnSprint: HTMLButtonElement;
  private readonly btnSwitch: HTMLButtonElement;
  private readonly btnInspect: HTMLButtonElement;

  private joyPointerId: number | null = null;
  private joyOriginX = 0;
  private joyOriginY = 0;
  private joyActive = false;
  private readonly joyRadius = 56;

  private lookPointerId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;

  private disposed = false;
  private visible = false;

  constructor(parent: HTMLElement, handlers: TouchControlHandlers) {
    this.handlers = handlers;

    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.className = 'touch-controls';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;

    // Left joystick zone
    const joyZone = document.createElement('div');
    joyZone.className = 'touch-zone touch-zone-move';
    joyZone.setAttribute('aria-label', 'Move');

    this.stickBase = document.createElement('div');
    this.stickBase.className = 'touch-stick-base';
    this.stickKnob = document.createElement('div');
    this.stickKnob.className = 'touch-stick-knob';
    this.stickBase.appendChild(this.stickKnob);
    this.stickBase.hidden = true;
    joyZone.appendChild(this.stickBase);

    // Right look pad (under action buttons)
    this.lookPad = document.createElement('div');
    this.lookPad.className = 'touch-zone touch-zone-look';
    this.lookPad.setAttribute('aria-label', 'Look');

    // Action cluster
    const actions = document.createElement('div');
    actions.className = 'touch-actions';

    this.btnFire = mkBtn('touch-btn touch-btn-fire', 'FIRE', 'Fire');
    this.btnAds = mkBtn('touch-btn touch-btn-ads', 'ADS', 'Aim down sights');
    this.btnJump = mkBtn('touch-btn', 'JMP', 'Jump');
    this.btnReload = mkBtn('touch-btn', 'RLD', 'Reload');
    this.btnSprint = mkBtn('touch-btn', 'SPR', 'Sprint');
    this.btnSwitch = mkBtn('touch-btn', 'WPN', 'Switch weapon');
    this.btnInspect = mkBtn('touch-btn touch-btn-inspect', 'INS', 'Inspect weapon');

    const colLeft = document.createElement('div');
    colLeft.className = 'touch-actions-col';
    colLeft.append(this.btnReload, this.btnSwitch, this.btnInspect, this.btnSprint);

    const colRight = document.createElement('div');
    colRight.className = 'touch-actions-col touch-actions-col-main';
    colRight.append(this.btnJump, this.btnAds, this.btnFire);

    actions.append(colLeft, colRight);

    this.root.append(joyZone, this.lookPad, actions);
    parent.appendChild(this.root);

    // Joystick
    joyZone.addEventListener('pointerdown', this.onJoyDown);
    joyZone.addEventListener('pointermove', this.onJoyMove);
    joyZone.addEventListener('pointerup', this.onJoyUp);
    joyZone.addEventListener('pointercancel', this.onJoyUp);

    // Look
    this.lookPad.addEventListener('pointerdown', this.onLookDown);
    this.lookPad.addEventListener('pointermove', this.onLookMove);
    this.lookPad.addEventListener('pointerup', this.onLookUp);
    this.lookPad.addEventListener('pointercancel', this.onLookUp);

    // Hold buttons
    bindHold(this.btnFire, (p) => this.handlers.onFire(p));
    bindHold(this.btnAds, (p) => this.handlers.onAds(p));
    bindHold(this.btnSprint, (p) => this.handlers.onSprint(p));

    // Tap buttons
    bindTap(this.btnJump, () => this.handlers.onJump());
    bindTap(this.btnReload, () => this.handlers.onReload());
    bindTap(this.btnSwitch, () => this.handlers.onSwitch());
    bindTap(this.btnInspect, () => this.handlers.onInspect());
  }

  setVisible(on: boolean): void {
    if (this.disposed) return;
    this.visible = on;
    this.root.hidden = !on;
    this.root.setAttribute('aria-hidden', on ? 'false' : 'true');
    this.root.classList.toggle('visible', on);
    if (!on) {
      this.resetAll();
    }
  }

  get isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resetAll();
    this.root.remove();
  }

  private resetAll(): void {
    this.endJoy();
    this.endLook();
    this.handlers.onFire(false);
    this.handlers.onAds(false);
    this.handlers.onSprint(false);
    this.handlers.onMove(0, 0);
    this.btnFire.classList.remove('active');
    this.btnAds.classList.remove('active');
    this.btnSprint.classList.remove('active');
  }

  private onJoyDown = (e: PointerEvent): void => {
    if (this.joyPointerId !== null || e.button > 0) return;
    e.preventDefault();
    this.joyPointerId = e.pointerId;
    this.joyActive = true;
    this.joyOriginX = e.clientX;
    this.joyOriginY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.stickBase.hidden = false;
    this.stickBase.style.left = `${e.clientX}px`;
    this.stickBase.style.top = `${e.clientY}px`;
    this.stickKnob.style.transform = 'translate(-50%, -50%)';
    this.handlers.onMove(0, 0);
  };

  private onJoyMove = (e: PointerEvent): void => {
    if (!this.joyActive || e.pointerId !== this.joyPointerId) return;
    e.preventDefault();
    const dx = e.clientX - this.joyOriginX;
    const dy = e.clientY - this.joyOriginY;
    const len = Math.hypot(dx, dy);
    const max = this.joyRadius;
    const clamped = len > max ? max / len : 1;
    const cx = dx * clamped;
    const cy = dy * clamped;
    this.stickKnob.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
    const nx = cx / max;
    const ny = cy / max;
    // Screen Y down → world forward is -ny in our WASD (W = +forward)
    this.handlers.onMove(nx, -ny);
  };

  private onJoyUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.joyPointerId) return;
    this.endJoy();
  };

  private endJoy(): void {
    this.joyPointerId = null;
    this.joyActive = false;
    this.stickBase.hidden = true;
    this.stickKnob.style.transform = 'translate(-50%, -50%)';
    this.handlers.onMove(0, 0);
  }

  private onLookDown = (e: PointerEvent): void => {
    if (this.lookPointerId !== null || e.button > 0) return;
    // Ignore if starting on an action button (buttons sit above look pad)
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('.touch-actions')) return;
    e.preventDefault();
    this.lookPointerId = e.pointerId;
    this.lookLastX = e.clientX;
    this.lookLastY = e.clientY;
    this.lookPad.setPointerCapture(e.pointerId);
  };

  private onLookMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointerId) return;
    e.preventDefault();
    const dx = e.clientX - this.lookLastX;
    const dy = e.clientY - this.lookLastY;
    this.lookLastX = e.clientX;
    this.lookLastY = e.clientY;
    this.handlers.onLook(dx, dy);
  };

  private onLookUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointerId) return;
    this.endLook();
  };

  private endLook(): void {
    this.lookPointerId = null;
  }
}

function mkBtn(cls: string, label: string, aria: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.setAttribute('aria-label', aria);
  return b;
}

function bindHold(btn: HTMLButtonElement, fn: (pressed: boolean) => void): void {
  let pid: number | null = null;
  const down = (e: PointerEvent) => {
    if (pid !== null || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    pid = e.pointerId;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('active');
    fn(true);
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    e.preventDefault();
    e.stopPropagation();
    pid = null;
    btn.classList.remove('active');
    fn(false);
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', () => {
    if (pid === null) return;
    pid = null;
    btn.classList.remove('active');
    fn(false);
  });
}

function bindTap(btn: HTMLButtonElement, fn: () => void): void {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.classList.add('active');
  });
  btn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.classList.remove('active');
    fn();
  });
  btn.addEventListener('pointercancel', () => btn.classList.remove('active'));
}
