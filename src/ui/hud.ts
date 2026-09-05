import type { Firearm } from '../combat/weapon';
import type { FpsController } from '../player/fpsController';
import * as THREE from 'three';

export interface ObjectiveState {
  label: string;
  kills: number;
  goal: number;
  complete: boolean;
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
  private hitmarkerTimer = 0;
  private damageTimer = 0;
  private killcamTimer = 0;
  private pickupTimer = 0;
  private readonly tmpFwd = new THREE.Vector3();
  private readonly tmpTo = new THREE.Vector3();

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

    // Signed angle from forward to objective in XZ (clockwise from above = positive for CSS)
    const cross = this.tmpFwd.x * this.tmpTo.z - this.tmpFwd.z * this.tmpTo.x;
    const dot = this.tmpFwd.x * this.tmpTo.x + this.tmpFwd.z * this.tmpTo.z;
    const ang = Math.atan2(cross, dot); // radians, + = objective to the right of look
    const deg = (-ang * 180) / Math.PI;
    this.compassNeedle.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
    this.compassLabel.textContent = dist < 8 ? 'NEAR' : `${Math.round(dist)}m`;
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
  }

  showPickup(msg: string): void {
    this.pickupToast.textContent = msg;
    this.pickupToast.classList.add('show');
    this.pickupTimer = 1.4;
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
  }
}
