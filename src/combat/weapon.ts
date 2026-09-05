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

/** Procedural low-poly rifle — stock / handguard / optic silhouette (not a box) */
function buildRifleViewModel(): {
  root: THREE.Group;
  muzzle: THREE.Object3D;
  flash: THREE.Mesh;
  flashCore: THREE.Mesh;
  flashLight: THREE.PointLight;
} {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f26,
    metalness: 0.82,
    roughness: 0.38,
    envMapIntensity: 1.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x2c3640,
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 1.3,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x181c20,
    roughness: 0.88,
    metalness: 0.08,
    envMapIntensity: 0.45,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0x0a1218,
    emissive: 0x5ce1ff,
    emissiveIntensity: 1.35,
    metalness: 0.3,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2830,
    metalness: 0.2,
    roughness: 0.15,
    emissive: 0x082018,
    emissiveIntensity: 0.4,
    envMapIntensity: 1.4,
    transparent: true,
    opacity: 0.85,
  });

  // Upper + lower receiver (stepped silhouette)
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.28), bodyMat);
  lower.position.set(0, 0.0, 0.02);
  root.add(lower);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.3), accentMat);
  upper.position.set(0, 0.065, -0.02);
  root.add(upper);

  // Picatinny rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.26), accentMat);
  rail.position.set(0, 0.1, -0.06);
  root.add(rail);
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.012), polymerMat);
    tooth.position.set(0, 0.115, -0.16 + i * 0.045);
    root.add(tooth);
  }

  // Handguard — hexagonal-ish mass
  const hg = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.07, 0.26), polymerMat);
  hg.position.set(0, 0.02, -0.28);
  root.add(hg);
  const hgSideL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.22), accentMat);
  hgSideL.position.set(-0.045, 0.02, -0.28);
  const hgSideR = hgSideL.clone();
  hgSideR.position.x = 0.045;
  root.add(hgSideL, hgSideR);

  // Barrel + gas block + muzzle device
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.42, 8), accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -0.52);
  root.add(barrel);
  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.05), bodyMat);
  gasBlock.position.set(0, 0.055, -0.42);
  root.add(gasBlock);
  const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.06, 8), accentMat);
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.035, -0.74);
  root.add(muzzleBrake);
  // Brake vents
  for (const side of [-1, 1]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.018), polymerMat);
    vent.position.set(side * 0.02, 0.035, -0.74);
    root.add(vent);
  }

  // Carry handle / rear iron + holographic optic silhouette
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.04), accentMat);
  rearSight.position.set(0, 0.13, 0.08);
  root.add(rearSight);

  const opticMount = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.1), polymerMat);
  opticMount.position.set(0, 0.125, -0.08);
  root.add(opticMount);
  const opticBody = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.09), bodyMat);
  opticBody.position.set(0, 0.165, -0.08);
  root.add(opticBody);
  const opticWindow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), glassMat);
  opticWindow.position.set(0, 0.165, -0.03);
  root.add(opticWindow);
  const reticle = new THREE.Mesh(
    new THREE.CircleGeometry(0.006, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  reticle.position.set(0, 0.165, -0.02);
  root.add(reticle);

  // Stock — collapsible silhouette (not a cube)
  const buffer = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 8), accentMat);
  buffer.rotation.x = Math.PI / 2;
  buffer.position.set(0, 0.02, 0.22);
  root.add(buffer);
  const stockTube = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), polymerMat);
  stockTube.position.set(0, 0.015, 0.32);
  root.add(stockTube);
  const butt = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.04), polymerMat);
  butt.position.set(0, -0.01, 0.4);
  root.add(butt);
  const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.02), bodyMat);
  buttPad.position.set(0, -0.01, 0.425);
  root.add(buttPad);
  const stockCheek = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.1), polymerMat);
  stockCheek.position.set(0, 0.05, 0.34);
  root.add(stockCheek);

  // Pistol grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.06), polymerMat);
  grip.position.set(0, -0.09, 0.1);
  grip.rotation.x = 0.35;
  root.add(grip);

  // Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.16, 0.075), accentMat);
  mag.position.set(0, -0.12, -0.02);
  mag.rotation.x = 0.08;
  root.add(mag);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.08), polymerMat);
  magBase.position.set(0, -0.2, -0.015);
  root.add(magBase);

  // Trigger guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.07), polymerMat);
  guard.position.set(0, -0.05, 0.06);
  root.add(guard);

  // Neon accent rail glow (subtle)
  const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.18), neonMat);
  railGlow.position.set(0.04, 0.05, -0.28);
  root.add(railGlow);

  // Forward grip nub
  const fgrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.04), polymerMat);
  fgrip.position.set(0, -0.04, -0.32);
  root.add(fgrip);

  for (const c of root.children) {
    const mesh = c as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.frustumCulled = false;
    }
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.035, -0.78);
  root.add(muzzle);

  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), flashMat);
  flash.position.copy(muzzle.position);
  root.add(flash);

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8e0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flashCore = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), coreMat);
  flashCore.position.copy(muzzle.position);
  root.add(flashCore);

  const flashLight = new THREE.PointLight(0xffcc88, 0, 8, 2);
  flashLight.position.copy(muzzle.position);
  root.add(flashLight);

  return { root, muzzle, flash, flashCore, flashLight };
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
  private idlePhase = 0;

  constructor(camera: THREE.PerspectiveCamera, effects: CombatEffects) {
    this.camera = camera;
    this.effects = effects;
    this.mag = this.stats.magSize;
    this.reserve = this.stats.reserve;

    const built = buildRifleViewModel();
    this.viewModel = built.root;
    this.viewModel.position.set(0.28, -0.28, -0.55);
    this.muzzle = built.muzzle;
    this.flash = built.flash;
    this.flashCore = built.flashCore;
    this.flashLight = built.flashLight;

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

    this.idlePhase += dt;

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
    const bobScale = THREE.MathUtils.lerp(1, 0.22, this.adsBlend);
    // Idle breath + walk bob polish
    const breathY = Math.sin(this.idlePhase * 1.4) * 0.004 * (1 - this.adsBlend * 0.7);
    const breathX = Math.sin(this.idlePhase * 0.9) * 0.0025 * (1 - this.adsBlend);
    if (!this.reloading) {
      const hipX = 0.3;
      const adsX = 0.0;
      const hipY = -0.3;
      const adsY = -0.2;
      const hipZ = -0.58;
      const adsZ = -0.45;
      this.viewModel.position.set(
        THREE.MathUtils.lerp(hipX, adsX, this.adsBlend) + this.bob.x * 1.55 * bobScale + breathX,
        THREE.MathUtils.lerp(hipY, adsY, this.adsBlend) + this.bob.y * bobScale + breathY,
        THREE.MathUtils.lerp(hipZ, adsZ, this.adsBlend) - this.kick * 0.07,
      );
      this.viewModel.rotation.set(
        this.kick * 0.05 + this.bob.y * 0.35 * bobScale,
        -this.bob.x * 0.95 * bobScale + breathX * 2,
        this.bob.x * 0.55 * bobScale - this.kick * 0.02,
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
