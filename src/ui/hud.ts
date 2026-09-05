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
  private hitmarkerTimer = 0;
  private damageTimer = 0;

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
    this.weaponName.textContent = weapon.reloading ? 'RELOADING…' : weapon.stats.name;
  }

  setFiring(firing: boolean): void {
    this.crosshair.classList.toggle('firing', firing);
  }

  showHitmarker(): void {
    this.hitmarker.classList.add('show');
    this.hitmarkerTimer = 0.12;
  }

  flashDamage(): void {
    this.damageFlash.classList.add('show');
    this.damageTimer = 0.18;
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
  }
}
