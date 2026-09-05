import * as THREE from 'three';
import type { CombatEffects } from './effects';
import type { EnemyTarget } from '../enemies/target';
import { gameAudio } from '../audio/sfx';

export interface WeaponStats {
  name: string;
  magSize: number;
  reserve: number;
  damage: number;
  rpm: number;
  reloadTime: number;
  spread: number;
  adsSpread: number;
  range: number;
  hipFov: number;
  adsFov: number;
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
    adsSpread: 0.004,
    range: 120,
    hipFov: 75,
    adsFov: 52,
  };

  mag: number;
  reserve: number;
  reloading = false;
  ads = false;
  adsBlend = 0;

  readonly viewModel: THREE.Group;
  private readonly muzzle: THREE.Object3D;
  private readonly flash: THREE.Mesh;
  private readonly flashLight: THREE.PointLight;
  private readonly flashCore: THREE.Mesh;
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
  private readonly right = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly shellPos = new THREE.Vector3();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly effects: CombatEffects;
  private readonly worldObjects: THREE.Object3D[] = [];
  private enemies: EnemyTarget[] = [];
  private onHitEnemy: ((e: EnemyTarget, killed: boolean) => void) | null = null;
  private onHud: (() => void) | null = null;
  private motionScale = 1;
  private wasAds = false;

  constructor(camera: THREE.PerspectiveCamera, effects: CombatEffects) {
    this.camera = camera;
    this.effects = effects;
    this.mag = this.stats.magSize;
    this.reserve = this.stats.reserve;

    this.viewModel = new THREE.Group();
    this.viewModel.position.set(0.28, -0.28, -0.55);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1c222a,
      metalness: 0.78,
      roughness: 0.4,
      envMapIntensity: 1.1,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x2e3a46,
      metalness: 0.9,
      roughness: 0.3,
      envMapIntensity: 1.2,
    });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.92, metalness: 0.08 });
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x0a1218,
      emissive: 0x5ce1ff,
      emissiveIntensity: 1.6,
      metalness: 0.3,
      roughness: 0.35,
    });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.42), bodyMat);
    receiver.position.set(0, 0.02, 0);
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

    const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.2), neonMat);
    railGlow.position.set(0, 0.075, -0.12);
    this.viewModel.add(railGlow);

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
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), flashMat);
    this.flash.position.copy(this.muzzle.position);
    this.viewModel.add(this.flash);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff8e0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.flashCore = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), coreMat);
    this.flashCore.position.copy(this.muzzle.position);
    this.viewModel.add(this.flashCore);

    this.flashLight = new THREE.PointLight(0xffcc88, 0, 8, 2);
    this.flashLight.position.copy(this.muzzle.position);
    this.viewModel.add(this.flashLight);

    camera.add(this.viewModel);
  }

  setMotionScale(scale: number): void {
    this.motionScale = scale;
  }

  setAds(on: boolean): void {
    if (this.reloading) {
      this.ads = false;
      return;
    }
    this.ads = on;
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
    this.ads = false;
    this.reloadTimer = this.stats.reloadTime;
    gameAudio.play('reload');
  }

  private fire(): void {
    this.mag -= 1;
    this.fireCooldown = 60 / this.stats.rpm;
    const recoilMul = this.ads ? 0.55 : 1;
    this.kick = 1;
    this.recoilPitch += (0.018 + Math.random() * 0.01) * recoilMul * this.motionScale;
    this.recoilYaw += (Math.random() - 0.5) * 0.012 * recoilMul * this.motionScale;
    this.flashTimer = 0.05;
    this.flashLight.intensity = 16;
    (this.flash.material as THREE.MeshBasicMaterial).opacity = 1;
    (this.flashCore.material as THREE.MeshBasicMaterial).opacity = 1;
    this.flash.rotation.z = Math.random() * Math.PI;
    this.flash.scale.setScalar(0.9 + Math.random() * 0.7);
    this.flashCore.scale.setScalar(0.8 + Math.random() * 0.5);

    gameAudio.play('gunshot');

    const spread = THREE.MathUtils.lerp(this.stats.spread, this.stats.adsSpread, this.adsBlend);

    this.camera.getWorldPosition(this.shootOrigin);
    this.camera.getWorldDirection(this.shootDir);
    this.shootDir.x += (Math.random() - 0.5) * spread;
    this.shootDir.y += (Math.random() - 0.5) * spread;
    this.shootDir.z += (Math.random() - 0.5) * spread;
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
      impactNormal =
        enemyHit.face?.normal.clone().transformDirection(enemyHit.object.matrixWorld).normalize() ??
        impactNormal;
      hitEnemy = this.enemies.find((e) => e.owns(enemyHit.object)) ?? null;
    } else if (worldHit) {
      impactPoint = worldHit.point;
      impactNormal =
        worldHit.face?.normal.clone().transformDirection(worldHit.object.matrixWorld).normalize() ??
        impactNormal;
    }

    const muzzleWorld = new THREE.Vector3();
    this.muzzle.getWorldPosition(muzzleWorld);
    this.effects.spawnTracer(muzzleWorld, impactPoint);
    this.effects.spawnImpact(impactPoint, impactNormal);

    // Shell casing eject to the right of the weapon
    this.camera.getWorldDirection(this.forward);
    this.right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.shellPos.copy(muzzleWorld).addScaledVector(this.right, 0.08).addScaledVector(this.forward, 0.05);
    this.shellPos.y -= 0.02;
    this.effects.spawnShell(this.shellPos, this.right, this.forward);

    if (hitEnemy) {
      const killed = hitEnemy.applyDamage(this.stats.damage);
      gameAudio.play('hit', {
        x: hitEnemy.mesh.position.x,
        y: hitEnemy.mesh.position.y + 1,
        z: hitEnemy.mesh.position.z,
      });
      if (killed) {
        gameAudio.play('death', {
          x: hitEnemy.mesh.position.x,
          y: hitEnemy.mesh.position.y + 1,
          z: hitEnemy.mesh.position.z,
        });
      }
      this.onHitEnemy?.(hitEnemy, killed);
    }

    this.onHud?.();
  }

  update(dt: number, bobOffset: THREE.Vector3, isLocked: boolean): void {
    const adsTarget = this.ads && !this.reloading ? 1 : 0;
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, adsTarget, 14, dt);
    if (this.ads && !this.wasAds) gameAudio.play('ads');
    this.wasAds = this.ads;

    const fov = THREE.MathUtils.lerp(this.stats.hipFov, this.stats.adsFov, this.adsBlend);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

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
    const bobScale = THREE.MathUtils.lerp(1, 0.25, this.adsBlend);
    if (!this.reloading) {
      const hipX = 0.28;
      const adsX = 0.0;
      const hipY = -0.28;
      const adsY = -0.18;
      const hipZ = -0.55;
      const adsZ = -0.42;
      this.viewModel.position.set(
        THREE.MathUtils.lerp(hipX, adsX, this.adsBlend) + this.bob.x * 1.4 * bobScale,
        THREE.MathUtils.lerp(hipY, adsY, this.adsBlend) + this.bob.y * bobScale,
        THREE.MathUtils.lerp(hipZ, adsZ, this.adsBlend) - this.kick * 0.06,
      );
      this.viewModel.rotation.set(
        this.kick * 0.04,
        -this.bob.x * 0.8 * bobScale,
        this.bob.x * 0.5 * bobScale,
      );
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        (this.flash.material as THREE.MeshBasicMaterial).opacity = 0;
        (this.flashCore.material as THREE.MeshBasicMaterial).opacity = 0;
        this.flashLight.intensity = 0;
      } else {
        this.flashLight.intensity = 16 * (this.flashTimer / 0.05);
      }
    }
  }
}
