import * as THREE from 'three';
import type { CombatEffects } from './effects';
import type { EnemyTarget } from '../enemies/target';

export interface WeaponStats {
  name: string;
  magSize: number;
  reserve: number;
  damage: number;
  rpm: number;
  reloadTime: number;
  spread: number;
  range: number;
}

export class Rifle {
  readonly stats: WeaponStats = {
    name: 'GROKY-16',
    magSize: 30,
    reserve: 90,
    damage: 28,
    rpm: 650,
    reloadTime: 1.65,
    spread: 0.012,
    range: 120,
  };

  mag: number;
  reserve: number;
  reloading = false;

  readonly viewModel: THREE.Group;
  private readonly muzzle: THREE.Object3D;
  private readonly flash: THREE.Mesh;
  private readonly flashLight: THREE.PointLight;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private kick = 0;
  private flashTimer = 0;
  private reloadTimer = 0;
  private fireCooldown = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly bob = new THREE.Vector3();
  private readonly shootOrigin = new THREE.Vector3();
  private readonly shootDir = new THREE.Vector3();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly effects: CombatEffects;
  private readonly worldObjects: THREE.Object3D[] = [];
  private enemies: EnemyTarget[] = [];
  private onHitEnemy: ((e: EnemyTarget, killed: boolean) => void) | null = null;
  private onHud: (() => void) | null = null;

  constructor(camera: THREE.PerspectiveCamera, effects: CombatEffects) {
    this.camera = camera;
    this.effects = effects;
    this.mag = this.stats.magSize;
    this.reserve = this.stats.reserve;

    this.viewModel = new THREE.Group();
    this.viewModel.position.set(0.28, -0.28, -0.55);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c222a, metalness: 0.7, roughness: 0.45 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x2e3a46, metalness: 0.85, roughness: 0.35 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.9, metalness: 0.1 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.42), bodyMat);
    receiver.position.set(0, 0.02, 0);
    receiver.castShadow = false;
    this.viewModel.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.38, 8), accentMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.35);
    this.viewModel.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), gripMat);
    stock.position.set(0, -0.01, 0.28);
    this.viewModel.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.08), accentMat);
    mag.position.set(0, -0.1, 0.02);
    this.viewModel.add(mag);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.22), gripMat);
    handguard.position.set(0, 0.0, -0.18);
    this.viewModel.add(handguard);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.06), accentMat);
    sight.position.set(0, 0.08, -0.05);
    this.viewModel.add(sight);

    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.03, -0.55);
    this.viewModel.add(this.muzzle);

    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfff0c0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), flashMat);
    this.flash.position.copy(this.muzzle.position);
    this.viewModel.add(this.flash);

    this.flashLight = new THREE.PointLight(0xffcc88, 0, 6, 2);
    this.flashLight.position.copy(this.muzzle.position);
    this.viewModel.add(this.flashLight);

    camera.add(this.viewModel);
  }

  setWorldTargets(objects: THREE.Object3D[], enemies: EnemyTarget[]): void {
    this.worldObjects.length = 0;
    this.worldObjects.push(...objects);
    this.enemies = enemies;
  }

  setCallbacks(onHitEnemy: (e: EnemyTarget, killed: boolean) => void, onHud: () => void): void {
    this.onHitEnemy = onHitEnemy;
    this.onHud = onHud;
  }

  tryFire(pressed: boolean, dt: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (!pressed || this.reloading || this.mag <= 0 || this.fireCooldown > 0) {
      if (pressed && this.mag <= 0 && !this.reloading) this.startReload();
      return;
    }
    this.fire();
  }

  startReload(): void {
    if (this.reloading || this.mag >= this.stats.magSize || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = this.stats.reloadTime;
  }

  private fire(): void {
    this.mag -= 1;
    this.fireCooldown = 60 / this.stats.rpm;
    this.kick = 1;
    this.recoilPitch += 0.018 + Math.random() * 0.01;
    this.recoilYaw += (Math.random() - 0.5) * 0.012;
    this.flashTimer = 0.045;
    this.flashLight.intensity = 12;
    (this.flash.material as THREE.MeshBasicMaterial).opacity = 1;
    this.flash.rotation.z = Math.random() * Math.PI;
    this.flash.scale.setScalar(0.8 + Math.random() * 0.6);

    this.camera.getWorldPosition(this.shootOrigin);
    this.camera.getWorldDirection(this.shootDir);
    this.shootDir.x += (Math.random() - 0.5) * this.stats.spread;
    this.shootDir.y += (Math.random() - 0.5) * this.stats.spread;
    this.shootDir.z += (Math.random() - 0.5) * this.stats.spread;
    this.shootDir.normalize();

    this.raycaster.set(this.shootOrigin, this.shootDir);
    this.raycaster.far = this.stats.range;

    const enemyMeshes = this.enemies.filter((e) => e.alive).map((e) => e.mesh);
    const hitsEnemies = this.raycaster.intersectObjects(enemyMeshes, true);
    const hitsWorld = this.raycaster.intersectObjects(this.worldObjects, true);

    let impactPoint = this.shootOrigin.clone().addScaledVector(this.shootDir, this.stats.range);
    let impactNormal = this.shootDir.clone().negate();
    let hitEnemy: EnemyTarget | null = null;

    const enemyHit = hitsEnemies[0];
    const worldHit = hitsWorld[0];

    if (enemyHit && (!worldHit || enemyHit.distance <= worldHit.distance)) {
      impactPoint = enemyHit.point;
      impactNormal = enemyHit.face?.normal.clone().transformDirection(enemyHit.object.matrixWorld).normalize() ?? impactNormal;
      hitEnemy = this.enemies.find((e) => e.owns(enemyHit.object)) ?? null;
    } else if (worldHit) {
      impactPoint = worldHit.point;
      impactNormal = worldHit.face?.normal.clone().transformDirection(worldHit.object.matrixWorld).normalize() ?? impactNormal;
    }

    // Tracer from muzzle world pos
    const muzzleWorld = new THREE.Vector3();
    this.muzzle.getWorldPosition(muzzleWorld);
    this.effects.spawnTracer(muzzleWorld, impactPoint);
    this.effects.spawnImpact(impactPoint, impactNormal);

    if (hitEnemy) {
      const killed = hitEnemy.applyDamage(this.stats.damage);
      this.onHitEnemy?.(hitEnemy, killed);
    }

    this.onHud?.();
  }

  update(dt: number, bobOffset: THREE.Vector3, isLocked: boolean): void {
    if (this.reloading) {
      this.reloadTimer -= dt;
      const t = 1 - this.reloadTimer / this.stats.reloadTime;
      this.viewModel.rotation.x = Math.sin(t * Math.PI) * 0.45;
      this.viewModel.position.y = -0.28 - Math.sin(t * Math.PI) * 0.12;
      if (this.reloadTimer <= 0) {
        const need = this.stats.magSize - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take;
        this.reserve -= take;
        this.reloading = false;
        this.viewModel.rotation.x = 0;
        this.onHud?.();
      }
    }

    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 10, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, 10, dt);
    this.kick = THREE.MathUtils.damp(this.kick, 0, 14, dt);

    if (isLocked) {
      this.camera.rotation.x += this.recoilPitch * 0.35;
      this.camera.rotation.y += this.recoilYaw * 0.35;
      this.camera.rotation.x = THREE.MathUtils.clamp(this.camera.rotation.x, -1.4, 1.4);
    }

    this.bob.copy(bobOffset);
    if (!this.reloading) {
      this.viewModel.position.set(
        0.28 + this.bob.x * 1.4,
        -0.28 + this.bob.y,
        -0.55 - this.kick * 0.06,
      );
      this.viewModel.rotation.set(
        this.kick * 0.04,
        -this.bob.x * 0.8,
        this.bob.x * 0.5,
      );
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        (this.flash.material as THREE.MeshBasicMaterial).opacity = 0;
        this.flashLight.intensity = 0;
      }
    }
  }
}
