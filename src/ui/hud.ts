import type { Firearm } from '../combat/weapon';
import type { FpsController } from '../player/fpsController';
import * as THREE from 'three';

export interface ObjectiveState {
  label: string;
  kills: number;
  goal: number;
  complete: boolean;
}

export interface MinimapBlip {
  x: number;
  z: number;
  kind: 'enemy' | 'tower' | 'player';
  alive?: boolean;
}

export class Hud {
  private readonly healthFill: HTMLElement;
  private readonly healthText: HTMLElement;
  private readonly ammoMag: HTMLElement;
  private readonly ammoReserve: HTMLElement;
  private readonly weaponName: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly hitmarker: HTMLElement;
  private readonly killFeed: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly damageFlash: HTMLElement;
  private readonly vignette: HTMLElement;
  private readonly killcam: HTMLElement;
  private readonly killcamName: HTMLElement;
  private readonly compassNeedle: HTMLElement;
  private readonly compassLabel: HTMLElement;
  private readonly objectiveEl: HTMLElement;
  private readonly objectiveFill: HTMLElement;
  private readonly slot1: HTMLElement;
  private readonly slot2: HTMLElement;
  private readonly pickupToast: HTMLElement;
  private readonly dmgLayer: HTMLElement;
  private readonly streakToast: HTMLElement;
  private readonly minimapCanvas: HTMLCanvasElement;
  private readonly minimapCtx: CanvasRenderingContext2D;
  private hitmarkerTimer = 0;
  private damageTimer = 0;
  private killcamTimer = 0;
  private pickupTimer = 0;
  private streakTimer = 0;
  private readonly tmpFwd = new THREE.Vector3();
  private readonly tmpTo = new THREE.Vector3();
  private readonly tmpProj = new THREE.Vector3();
  private killStreak = 0;
  private streakWindow = 0;

  constructor() {
    this.healthFill = document.getElementById('health-fill')!;
    this.healthText = document.getElementById('health-text')!;
    this.ammoMag = document.getElementById('ammo-mag')!;
    this.ammoReserve = document.getElementById('ammo-reserve')!;
    this.weaponName = document.getElementById('weapon-name')!;
    this.crosshair = document.getElementById('crosshair')!;
    this.hitmarker = document.getElementById('hitmarker')!;
    this.killFeed = document.getElementById('kill-feed')!;
    this.overlay = document.getElementById('overlay')!;
    this.damageFlash = document.getElementById('damage-flash')!;
    this.vignette = document.getElementById('vignette')!;
    this.killcam = document.getElementById('killcam')!;
    this.killcamName = document.getElementById('killcam-name')!;
    this.compassNeedle = document.getElementById('compass-needle')!;
    this.compassLabel = document.getElementById('compass-label')!;
    this.objectiveEl = document.getElementById('objective')!;
    this.objectiveFill = document.getElementById('objective-fill')!;
    this.slot1 = document.getElementById('slot-1')!;
    this.slot2 = document.getElementById('slot-2')!;
    this.pickupToast = document.getElementById('pickup-toast')!;
    this.dmgLayer = document.getElementById('dmg-layer')!;
    this.streakToast = document.getElementById('streak-toast')!;
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
  }

  showOverlay(show: boolean): void {
    this.overlay.classList.toggle('visible', show);
  }

  sync(player: FpsController, weapon: Firearm, slot = 1): void {
    const hp = player.state.health;
    const pct = (hp / player.state.maxHealth) * 100;
    this.healthFill.style.width = `${pct}%`;
    this.healthText.textContent = String(Math.round(hp));
    this.ammoMag.textContent = String(weapon.mag);
    this.ammoMag.classList.toggle('low', weapon.mag <= Math.max(5, Math.floor(weapon.stats.magSize * 0.25)));
    this.ammoReserve.textContent = String(weapon.reserve);
    this.weaponName.textContent = weapon.reloading
      ? 'RELOADING…'
      : weapon.adsBlend > 0.55
        ? `${weapon.stats.name} · ADS`
        : weapon.stats.name;
    this.slot1.classList.toggle('active', slot === 1);
    this.slot2.classList.toggle('active', slot === 2);
  }

  setObjective(obj: ObjectiveState): void {
    const pct = Math.min(100, (obj.kills / obj.goal) * 100);
    this.objectiveFill.style.width = `${pct}%`;
    this.objectiveEl.classList.toggle('done', obj.complete);
    const status = obj.complete
      ? 'OBJECTIVE COMPLETE'
      : `${obj.label}  ${obj.kills}/${obj.goal}`;
    const text = this.objectiveEl.querySelector('.obj-text');
    if (text) text.textContent = status;
  }

  /** Compass needle toward world objective; yaw from camera look. */
  updateCompass(
    camera: THREE.Camera,
    playerPos: THREE.Vector3,
    objective: THREE.Vector3,
  ): void {
    camera.getWorldDirection(this.tmpFwd);
    this.tmpFwd.y = 0;
    if (this.tmpFwd.lengthSq() < 1e-6) return;
    this.tmpFwd.normalize();

    this.tmpTo.copy(objective).sub(playerPos);
    this.tmpTo.y = 0;
    const dist = this.tmpTo.length();
    if (dist < 0.01) {
      this.compassNeedle.style.transform = 'translate(-50%, -100%) rotate(0deg)';
      this.compassLabel.textContent = 'OBJ';
      return;
    }
    this.tmpTo.normalize();

    const cross = this.tmpFwd.x * this.tmpTo.z - this.tmpFwd.z * this.tmpTo.x;
    const dot = this.tmpFwd.x * this.tmpTo.x + this.tmpFwd.z * this.tmpTo.z;
    const ang = Math.atan2(cross, dot);
    const deg = (-ang * 180) / Math.PI;
    this.compassNeedle.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
    this.compassLabel.textContent = dist < 8 ? 'NEAR' : `${Math.round(dist)}m`;
  }

  /**
   * Top-down radar: player-centered, rotated so camera forward = up.
   * Arena half-extent ~28 matches arena clamps.
   */
  updateMinimap(
    camera: THREE.Camera,
    playerPos: THREE.Vector3,
    tower: THREE.Vector3,
    enemies: Array<{ x: number; z: number; alive: boolean }>,
  ): void {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const range = 28; // world units half-extent shown
    const scale = (w * 0.42) / range;

    camera.getWorldDirection(this.tmpFwd);
    this.tmpFwd.y = 0;
    if (this.tmpFwd.lengthSq() < 1e-6) this.tmpFwd.set(0, 0, -1);
    else this.tmpFwd.normalize();
    const yaw = Math.atan2(this.tmpFwd.x, this.tmpFwd.z);

    ctx.clearRect(0, 0, w, h);
    // Backdrop
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, w * 0.55);
    g.addColorStop(0, 'rgba(18, 36, 48, 0.95)');
    g.addColorStop(1, 'rgba(4, 8, 12, 0.98)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Grid rings
    ctx.strokeStyle = 'rgba(92, 225, 255, 0.18)';
    ctx.lineWidth = 1;
    for (const r of [0.28, 0.48, 0.68]) {
      ctx.beginPath();
      ctx.arc(cx, cy, w * r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx, h - 8);
    ctx.moveTo(8, cy);
    ctx.lineTo(w - 8, cy);
    ctx.stroke();

    const toRadar = (wx: number, wz: number): [number, number] => {
      const dx = wx - playerPos.x;
      const dz = wz - playerPos.z;
      // Rotate so camera forward points up on radar
      const cos = Math.cos(-yaw);
      const sin = Math.sin(-yaw);
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      return [cx + rx * scale, cy - rz * scale];
    };

    // Tower objective
    {
      const [tx, ty] = toRadar(tower.x, tower.z);
      ctx.fillStyle = '#5ce1ff';
      ctx.strokeStyle = 'rgba(92, 225, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 6);
      ctx.lineTo(tx + 5, ty + 4);
      ctx.lineTo(tx - 5, ty + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      const [ex, ey] = toRadar(e.x, e.z);
      if (ex < 4 || ey < 4 || ex > w - 4 || ey > h - 4) continue;
      ctx.fillStyle = '#ff3b4a';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 59, 74, 0.35)';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (center chevron)
    ctx.fillStyle = '#eaf7ff';
    ctx.strokeStyle = 'rgba(92, 225, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  setFiring(firing: boolean): void {
    this.crosshair.classList.toggle('firing', firing);
  }

  setAds(ads: boolean): void {
    this.crosshair.classList.toggle('ads', ads);
    this.vignette.classList.toggle('ads', ads);
  }

  showHitmarker(): void {
    this.hitmarker.classList.add('show');
    this.hitmarkerTimer = 0.12;
  }

  flashDamage(): void {
    this.damageFlash.classList.add('show');
    this.damageTimer = 0.18;
  }

  showKillcam(name: string): void {
    this.killcamName.textContent = `TARGET-${name}`;
    this.killcam.classList.add('show');
    this.killcamTimer = 1.15;
  }

  /** Floating damage number at world point projected to screen. */
  showDamageNumber(
    camera: THREE.Camera,
    worldPos: THREE.Vector3,
    amount: number,
    killed: boolean,
  ): void {
    this.tmpProj.copy(worldPos);
    this.tmpProj.project(camera);
    const x = (this.tmpProj.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.tmpProj.y * 0.5 + 0.5) * window.innerHeight;
    if (this.tmpProj.z > 1) return;
    const el = document.createElement('div');
    el.className = killed ? 'dmg-num kill' : 'dmg-num';
    el.textContent = killed ? `${amount} ✕` : String(amount);
    el.style.left = `${x + (Math.random() - 0.5) * 28}px`;
    el.style.top = `${y - 18 - Math.random() * 12}px`;
    this.dmgLayer.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  pushKill(name: string): void {
    const el = document.createElement('div');
    el.className = 'item';
    el.textContent = `ELIMINATED  TARGET-${name}`;
    this.killFeed.prepend(el);
    setTimeout(() => el.remove(), 2800);
    while (this.killFeed.children.length > 4) {
      this.killFeed.lastElementChild?.remove();
    }
    this.showKillcam(name);

    // Kill streak window (~3.2s)
    if (this.streakWindow > 0) this.killStreak += 1;
    else this.killStreak = 1;
    this.streakWindow = 3.2;
    if (this.killStreak >= 2) {
      this.showStreak(this.killStreak);
    }
  }

  private showStreak(n: number): void {
    const labels: Record<number, string> = {
      2: 'DOUBLE KILL',
      3: 'TRIPLE KILL',
      4: 'MULTI KILL',
      5: 'KILLING SPREE',
    };
    const title = labels[Math.min(n, 5)] ?? `${n} KILL STREAK`;
    const sub =
      n >= 5 ? 'UNSTOPPABLE' : n >= 4 ? 'DOMINATING' : n >= 3 ? 'ON FIRE' : 'NICE';
    this.streakToast.innerHTML = `${title}<span class="streak-sub">${sub}</span>`;
    this.streakToast.classList.add('show');
    this.streakTimer = 1.55;
  }

  showPickup(msg: string): void {
    this.pickupToast.textContent = msg;
    this.pickupToast.classList.add('show');
    this.pickupTimer = 1.4;
  }

  showWaveToast(wave: number, count: number): void {
    this.showPickup(`WAVE ${wave} · +${count} HOSTILES`);
  }

  update(dt: number): void {
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dt;
      if (this.hitmarkerTimer <= 0) this.hitmarker.classList.remove('show');
    }
    if (this.damageTimer > 0) {
      this.damageTimer -= dt;
      if (this.damageTimer <= 0) this.damageFlash.classList.remove('show');
    }
    if (this.killcamTimer > 0) {
      this.killcamTimer -= dt;
      if (this.killcamTimer <= 0) this.killcam.classList.remove('show');
    }
    if (this.pickupTimer > 0) {
      this.pickupTimer -= dt;
      if (this.pickupTimer <= 0) this.pickupToast.classList.remove('show');
    }
    if (this.streakTimer > 0) {
      this.streakTimer -= dt;
      if (this.streakTimer <= 0) this.streakToast.classList.remove('show');
    }
    if (this.streakWindow > 0) {
      this.streakWindow -= dt;
      if (this.streakWindow <= 0) this.killStreak = 0;
    }
  }
}
