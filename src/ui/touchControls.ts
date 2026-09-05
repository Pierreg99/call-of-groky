/** Mobile / coarse-pointer virtual controls overlay — circular icon action buttons. */

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

const ICONS = {
  fire: `<svg viewBox="0 0 24 24" aria-hidden="true" class="touch-icon"><path fill="currentColor" d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zm0 8.2l.55 1.5 1.5.55-1.5.55-.55 1.5-.55-1.5-1.5-.55 1.5-.55.55-1.5z"/><path fill="currentColor" opacity=".85" d="M5 15.5l1.1 2.9L9 19.5l-2.9 1.1L5 23.5l-1.1-2.9L1 19.5l2.9-1.1L5 15.5zm14-1l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"/></svg>`,
  ads: `<svg viewBox="0 0 24 24" aria-hidden="true" class="touch-icon"><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="0.9" fill="currentColor"/><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 3.2v2.6M12 18.2v2.6M3.2 12h2.6M18.2 12h2.6"/></svg>`,
  jump: `<svg viewBox="0 0 24 24" aria-hidden="true" class="touch-icon"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M6 14l6-6 6 6"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".7" d="M8 18l4-4 4 4"/></svg>`,
  reload: `<svg viewBox="0 0 24 24" aria-hidden="true" class="touch-icon"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path fill="currentColor" d="M19.2 3.8v5.2h-5.2l5.2-5.2z"/></svg>`,
  sprint: `<svg viewBox="0 0 24 24" aria-hidden="true" class="touch-icon"><path fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" d="M8 6l6 6-6 6"/><path fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity=".65" d="M13 6l6 6-6 6"/></svg>`,
  switch: `<svg viewBox="0 0 24 24" aria-hidden="true" class="touch-icon"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 8h11M15 5l3 3-3 3M17 16H6M9 13l-3 3 3 3"/><rect x="4.5" y="9.5" width="6" height="2.2" rx=".6" fill="currentColor" opacity=".85"/><rect x="13.5" y="12.3" width="6" height="2.2" rx=".6" fill="currentColor" opacity=".55"/></svg>`,
  inspect: `<svg viewBox="0 0 24 24" aria-hidden="true" class="touch-icon"><circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path stroke="currentColor" stroke-width="2.1" stroke-linecap="round" d="M15.8 15.8L20 20"/><circle cx="11" cy="11" r="1.2" fill="currentColor"/></svg>`,
} as const;

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

  /** Touch ADS: 'off' | 'hold' (finger down) | 'toggle' (sticky after tap). */
  private adsMode: 'off' | 'hold' | 'toggle' = 'off';
  private adsDownAt = 0;
  private adsWasToggle = false;
  private readonly adsTapMs = 240;

  constructor(parent: HTMLElement, handlers: TouchControlHandlers) {
    this.handlers = handlers;

    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.className = 'touch-controls';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;

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

    this.lookPad = document.createElement('div');
    this.lookPad.className = 'touch-zone touch-zone-look';
    this.lookPad.setAttribute('aria-label', 'Look');

    const actions = document.createElement('div');
    actions.className = 'touch-actions';

    this.btnFire = mkIconBtn('touch-btn touch-btn-fire', ICONS.fire, 'Fire');
    this.btnAds = mkIconBtn('touch-btn touch-btn-ads', ICONS.ads, 'Aim down sights');
    this.btnJump = mkIconBtn('touch-btn', ICONS.jump, 'Jump');
    this.btnReload = mkIconBtn('touch-btn', ICONS.reload, 'Reload');
    this.btnSprint = mkIconBtn('touch-btn', ICONS.sprint, 'Sprint');
    this.btnSwitch = mkIconBtn('touch-btn', ICONS.switch, 'Switch weapon');
    this.btnInspect = mkIconBtn('touch-btn touch-btn-inspect', ICONS.inspect, 'Inspect weapon');

    const colLeft = document.createElement('div');
    colLeft.className = 'touch-actions-col';
    colLeft.append(this.btnReload, this.btnSwitch, this.btnInspect, this.btnSprint);

    const colRight = document.createElement('div');
    colRight.className = 'touch-actions-col touch-actions-col-main';
    colRight.append(this.btnJump, this.btnAds, this.btnFire);

    actions.append(colLeft, colRight);

    this.root.append(joyZone, this.lookPad, actions);
    parent.appendChild(this.root);

    joyZone.addEventListener('pointerdown', this.onJoyDown);
    joyZone.addEventListener('pointermove', this.onJoyMove);
    joyZone.addEventListener('pointerup', this.onJoyUp);
    joyZone.addEventListener('pointercancel', this.onJoyUp);

    this.lookPad.addEventListener('pointerdown', this.onLookDown);
    this.lookPad.addEventListener('pointermove', this.onLookMove);
    this.lookPad.addEventListener('pointerup', this.onLookUp);
    this.lookPad.addEventListener('pointercancel', this.onLookUp);

    bindHold(this.btnFire, (p) => this.handlers.onFire(p));
    this.bindAdsToggleHold();
    bindHold(this.btnSprint, (p) => this.handlers.onSprint(p));

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

  private syncAdsVisual(): void {
    this.btnAds.classList.toggle('active', this.adsMode !== 'off');
    this.btnAds.classList.toggle('toggled', this.adsMode === 'toggle');
  }

  private setAdsPressed(on: boolean): void {
    this.handlers.onAds(on);
    this.syncAdsVisual();
  }

  /** Tap = sticky toggle; longer press = hold-to-ADS (release clears). */
  private bindAdsToggleHold(): void {
    const btn = this.btnAds;
    let pid: number | null = null;

    const down = (e: PointerEvent) => {
      if (pid !== null || e.button > 0) return;
      e.preventDefault();
      e.stopPropagation();
      pid = e.pointerId;
      btn.setPointerCapture(e.pointerId);
      this.adsDownAt = performance.now();
      this.adsWasToggle = this.adsMode === 'toggle';
      if (this.adsMode !== 'toggle') {
        this.adsMode = 'hold';
        this.setAdsPressed(true);
      } else {
        this.syncAdsVisual();
      }
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      e.preventDefault();
      e.stopPropagation();
      pid = null;
      const dur = performance.now() - this.adsDownAt;
      if (dur < this.adsTapMs) {
        if (this.adsWasToggle) {
          this.adsMode = 'off';
          this.setAdsPressed(false);
        } else {
          this.adsMode = 'toggle';
          this.setAdsPressed(true);
        }
      } else if (this.adsWasToggle) {
        this.adsMode = 'toggle';
        this.setAdsPressed(true);
      } else {
        this.adsMode = 'off';
        this.setAdsPressed(false);
      }
    };

    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', () => {
      if (pid === null) return;
      pid = null;
      if (this.adsMode === 'hold') {
        this.adsMode = 'off';
        this.setAdsPressed(false);
      }
    });
  }

  private resetAll(): void {
    this.endJoy();
    this.endLook();
    this.handlers.onFire(false);
    this.adsMode = 'off';
    this.handlers.onAds(false);
    this.handlers.onSprint(false);
    this.handlers.onMove(0, 0);
    this.btnFire.classList.remove('active');
    this.btnAds.classList.remove('active', 'toggled');
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

function mkIconBtn(cls: string, svg: string, aria: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.innerHTML = svg;
  b.setAttribute('aria-label', aria);
  b.title = aria;
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
