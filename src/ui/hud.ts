import type { Rifle } from '../combat/weapon';
import type { FpsController } from '../player/fpsController';

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
  private hitmarkerTimer = 0;
  private damageTimer = 0;
  private killcamTimer = 0;

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
  }

  showOverlay(show: boolean): void {
    this.overlay.classList.toggle('visible', show);
  }

  sync(player: FpsController, weapon: Rifle): void {
    const hp = player.state.health;
    const pct = (hp / player.state.maxHealth) * 100;
    this.healthFill.style.width = `${pct}%`;
    this.healthText.textContent = String(Math.round(hp));
    this.ammoMag.textContent = String(weapon.mag);
    this.ammoMag.classList.toggle('low', weapon.mag <= 7);
    this.ammoReserve.textContent = String(weapon.reserve);
    this.weaponName.textContent = weapon.reloading
      ? 'RELOADING…'
      : weapon.adsBlend > 0.55
        ? `${weapon.stats.name} · ADS`
        : weapon.stats.name;
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

  /** Killcam-lite banner punch */
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
  }
}
