import * as THREE from 'three';
import type { CombatEffects } from './effects';
import type { EnemyTarget } from '../enemies/target';
import { gameAudio } from '../audio/sfx';
import type { SoldierAssets } from '../enemies/gltfAssets';

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
  /** Per-shot pitch kick (radians-ish scale) */
  recoilPitch: number;
  /** Per-shot yaw jitter scale */
  recoilYaw: number;
  /** ADS multiplies recoil by this */
  recoilAdsMul: number;
  /** Viewmodel kick-back strength */
  kickAmount: number;
  hipPos: [number, number, number];
  adsPos: [number, number, number];
  slot: 1 | 2;
  kind: 'rifle' | 'smg';
}

export interface ViewModelBuilt {
  root: THREE.Group;
  muzzle: THREE.Object3D;
  flash: THREE.Mesh;
  flashCore: THREE.Mesh;
  flashLight: THREE.PointLight;
}

function matKit() {
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
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x3a4550,
    roughness: 0.82,
    metalness: 0.12,
    envMapIntensity: 0.55,
    emissive: 0x0a1014,
    emissiveIntensity: 0.15,
  });
  return { bodyMat, accentMat, polymerMat, neonMat, glassMat, gloveMat };
}

function finishViewModel(
  root: THREE.Group,
  muzzlePos: THREE.Vector3,
  tint: { flash: number; core: number; light: number } = {
    flash: 0xfff0c0,
    core: 0xfff8e0,
    light: 0xffcc88,
  },
): ViewModelBuilt {
  for (const c of root.children) {
    const mesh = c as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.frustumCulled = false;
    }
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.copy(muzzlePos);
  root.add(muzzle);

  const flashMat = new THREE.MeshBasicMaterial({
    color: tint.flash,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), flashMat);
  flash.position.copy(muzzle.position);
  root.add(flash);

  const coreMat = new THREE.MeshBasicMaterial({
    color: tint.core,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flashCore = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), coreMat);
  flashCore.position.copy(muzzle.position);
  root.add(flashCore);

  const flashLight = new THREE.PointLight(tint.light, 0, 8, 2);
  flashLight.position.copy(muzzle.position);
  root.add(flashLight);

  return { root, muzzle, flash, flashCore, flashLight };
}

/** Procedural low-poly assault rifle — stock / handguard / optic silhouette */
function buildRifleViewModel(): ViewModelBuilt {
  const root = new THREE.Group();
  const { bodyMat, accentMat, polymerMat, neonMat, glassMat, gloveMat } = matKit();

  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.28), bodyMat);
  lower.position.set(0, 0.0, 0.02);
  root.add(lower);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.3), accentMat);
  upper.position.set(0, 0.065, -0.02);
  root.add(upper);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.018, 0.26), accentMat);
  rail.position.set(0, 0.1, -0.06);
  root.add(rail);
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.012), polymerMat);
    tooth.position.set(0, 0.115, -0.16 + i * 0.045);
    root.add(tooth);
  }

  const hg = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.07, 0.26), polymerMat);
  hg.position.set(0, 0.02, -0.28);
  root.add(hg);
  const hgSideL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.22), accentMat);
  hgSideL.position.set(-0.045, 0.02, -0.28);
  const hgSideR = hgSideL.clone();
  hgSideR.position.x = 0.045;
  root.add(hgSideL, hgSideR);

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
  for (const side of [-1, 1]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, 0.018), polymerMat);
    vent.position.set(side * 0.02, 0.035, -0.74);
    root.add(vent);
  }

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.04), accentMat);
  rearSight.position.set(0, 0.13, 0.08);
  root.add(rearSight);

  const opticMount = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.1), polymerMat);
  opticMount.position.set(0, 0.125, -0.08);
  root.add(opticMount);
  const opticBody = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.09), bodyMat);
  opticBody.position.set(0, 0.165, -0.08);
  root.add(opticBody);
  const opticWindow = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.022), glassMat);
  opticWindow.position.set(0, 0.168, -0.028);
  root.add(opticWindow);
  const reticleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.01, 0.014, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff2233,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  reticleRing.position.set(0, 0.168, -0.016);
  root.add(reticleRing);
  const reticle = new THREE.Mesh(
    new THREE.CircleGeometry(0.0035, 10),
    new THREE.MeshBasicMaterial({ color: 0xff5566, transparent: true, opacity: 1, depthWrite: false }),
  );
  reticle.position.set(0, 0.168, -0.015);
  root.add(reticle);

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

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.06), polymerMat);
  grip.position.set(0, -0.09, 0.1);
  grip.rotation.x = 0.35;
  root.add(grip);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.16, 0.075), accentMat);
  mag.position.set(0, -0.12, -0.02);
  mag.rotation.x = 0.08;
  root.add(mag);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.08), polymerMat);
  magBase.position.set(0, -0.2, -0.015);
  root.add(magBase);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.07), polymerMat);
  guard.position.set(0, -0.05, 0.06);
  root.add(guard);

  const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.18), neonMat);
  railGlow.position.set(0.04, 0.05, -0.28);
  root.add(railGlow);

  const fgrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.04), polymerMat);
  fgrip.position.set(0, -0.04, -0.32);
  root.add(fgrip);

  const palmR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.07), gloveMat);
  palmR.position.set(0.055, -0.125, 0.1);
  palmR.rotation.set(0.58, 0.08, 0.18);
  palmR.userData.keepView = true;
  root.add(palmR);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.055, 0.016), gloveMat);
    f.position.set(0.01 + i * 0.016, -0.175, 0.085);
    f.rotation.x = 1.05;
    root.add(f);
  }
  const thumbR = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.04, 0.016), gloveMat);
  thumbR.position.set(0.07, -0.12, 0.06);
  thumbR.rotation.set(0.3, 0, -0.8);
  root.add(thumbR);

  const palmL = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.1, 0.065), gloveMat);
  palmL.position.set(-0.055, -0.04, -0.3);
  palmL.rotation.set(0.4, 0.04, -0.22);
  palmL.userData.keepView = true;
  root.add(palmL);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.05, 0.014), gloveMat);
    f.position.set(-0.055 + i * 0.015, -0.08, -0.29);
    f.rotation.x = 0.85;
    root.add(f);
  }
  const cuffL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.05), polymerMat);
  cuffL.position.set(-0.04, -0.01, -0.2);
  root.add(cuffL);
  const cuffR = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.045), polymerMat);
  cuffR.position.set(0.04, -0.05, 0.14);
  cuffR.rotation.x = 0.4;
  root.add(cuffR);

  return finishViewModel(root, new THREE.Vector3(0, 0.035, -0.78));
}

/** Compact SMG — short barrel, stick mag, red-dot, distinct hands */
function buildSmgViewModel(): ViewModelBuilt {
  const root = new THREE.Group();
  const { bodyMat, accentMat, polymerMat, glassMat, gloveMat } = matKit();
  const neonOrange = new THREE.MeshStandardMaterial({
    color: 0x120a08,
    emissive: 0xff6a3d,
    emissiveIntensity: 1.2,
    metalness: 0.25,
    roughness: 0.4,
  });

  // Compact receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.085, 0.22), bodyMat);
  receiver.position.set(0, 0.02, 0.0);
  root.add(receiver);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.2), accentMat);
  upper.position.set(0, 0.07, -0.02);
  root.add(upper);

  // Short handguard + barrel shroud
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.14), polymerMat);
  shroud.position.set(0, 0.025, -0.2);
  root.add(shroud);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.22, 8), accentMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.03, -0.34);
  root.add(barrel);
  const muzzleDev = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.04, 8), accentMat);
  muzzleDev.rotation.x = Math.PI / 2;
  muzzleDev.position.set(0, 0.03, -0.46);
  root.add(muzzleDev);

  // Folding stock stub (collapsed silhouette)
  const stockFold = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.1), polymerMat);
  stockFold.position.set(0, 0.03, 0.16);
  root.add(stockFold);
  const stockBrace = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), accentMat);
  stockBrace.position.set(0.02, -0.01, 0.2);
  stockBrace.rotation.z = 0.3;
  root.add(stockBrace);

  // Stick magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.05), accentMat);
  mag.position.set(0, -0.14, 0.02);
  mag.rotation.x = 0.12;
  root.add(mag);

  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.05), polymerMat);
  grip.position.set(0, -0.08, 0.08);
  grip.rotation.x = 0.42;
  root.add(grip);

  // Red-dot optic (smaller / different from rifle holo)
  const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.06), polymerMat);
  opticBase.position.set(0, 0.1, -0.02);
  root.add(opticBase);
  const opticTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), bodyMat);
  opticTube.rotation.x = Math.PI / 2;
  opticTube.position.set(0, 0.13, -0.02);
  root.add(opticTube);
  const opticLens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), glassMat);
  opticLens.position.set(0, 0.13, 0.005);
  root.add(opticLens);
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.0028, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 1, depthWrite: false }),
  );
  dot.position.set(0, 0.13, 0.008);
  root.add(dot);

  // Orange accent strip (SMG identity)
  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.12), neonOrange);
  accent.position.set(0.035, 0.04, -0.16);
  root.add(accent);

  // Hands — tighter SMG hold
  const palmR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.06), gloveMat);
  palmR.position.set(0.05, -0.11, 0.08);
  palmR.rotation.set(0.65, 0.1, 0.2);
  root.add(palmR);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.014), gloveMat);
    f.position.set(0.01 + i * 0.014, -0.155, 0.065);
    f.rotation.x = 1.1;
    root.add(f);
  }
  const palmL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.055), gloveMat);
  palmL.position.set(-0.045, -0.02, -0.18);
  palmL.rotation.set(0.35, 0.05, -0.25);
  root.add(palmL);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.04, 0.012), gloveMat);
    f.position.set(-0.05 + i * 0.013, -0.05, -0.17);
    f.rotation.x = 0.9;
    root.add(f);
  }

  return finishViewModel(root, new THREE.Vector3(0, 0.03, -0.5), {
    flash: 0xff7a3d,
    core: 0xffd0a0,
    light: 0xff6a3d,
  });
}

export const RIFLE_STATS: WeaponStats = {
  name: 'GROKY-16',
  magSize: 30,
  reserve: 90,
  damage: 28,
  rpm: 650,
  reloadTime: 1.65,
  spread: 0.011,
  adsSpread: 0.0035,
  range: 120,
  hipFov: 75,
  adsFov: 52,
  recoilPitch: 0.019,
  recoilYaw: 0.011,
  recoilAdsMul: 0.52,
  kickAmount: 0.072,
  hipPos: [0.3, -0.3, -0.58],
  adsPos: [0.0, -0.168, -0.38],
  slot: 1,
  kind: 'rifle',
};

export const SMG_STATS: WeaponStats = {
  name: 'GROKY-9',
  magSize: 25,
  reserve: 100,
  damage: 18,
  rpm: 900,
  reloadTime: 1.35,
  spread: 0.018,
  adsSpread: 0.007,
  range: 70,
  hipFov: 78,
  adsFov: 58,
  recoilPitch: 0.012,
  recoilYaw: 0.016,
  recoilAdsMul: 0.62,
  kickAmount: 0.045,
  hipPos: [0.26, -0.26, -0.48],
  adsPos: [0.0, -0.145, -0.34],
  slot: 2,
  kind: 'smg',
};

/** Generalized firearm (rifle / SMG) with per-weapon recoil / ADS / fire-rate polish */
export class Firearm {
  readonly stats: WeaponStats;
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
  private onHitEnemy: ((e: EnemyTarget, killed: boolean, damage: number) => void) | null = null;
  private onHud: (() => void) | null = null;
  private motionScale = 1;
  private wasAds = false;
  private idlePhase = 0;
  private active = true;
  private switchCooldown = 0;

  usedGltfRifle = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    effects: CombatEffects,
    stats: WeaponStats,
    built: ViewModelBuilt,
    _assets: SoldierAssets | null = null,
  ) {
    this.camera = camera;
    this.effects = effects;
    this.stats = stats;
    this.mag = stats.magSize;
    this.reserve = stats.reserve;

    this.viewModel = built.root;
    this.viewModel.position.set(...stats.hipPos);
    this.muzzle = built.muzzle;
    this.flash = built.flash;
    this.flashCore = built.flashCore;
    this.flashLight = built.flashLight;

    camera.add(this.viewModel);
  }

  setActive(on: boolean): void {
    this.active = on;
    this.viewModel.visible = on;
    if (!on) {
      this.ads = false;
      this.reloading = false;
      this.kick = 0;
      (this.flash.material as THREE.MeshBasicMaterial).opacity = 0;
      (this.flashCore.material as THREE.MeshBasicMaterial).opacity = 0;
      this.flashLight.intensity = 0;
    } else {
      this.switchCooldown = 0.28;
      // Brief raise-on-switch
      this.viewModel.position.y = this.stats.hipPos[1] - 0.18;
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  setMotionScale(scale: number): void {
    this.motionScale = scale;
  }

  setAds(on: boolean): void {
    if (!this.active || this.reloading || this.switchCooldown > 0) {
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

  setCallbacks(onHitEnemy: (e: EnemyTarget, killed: boolean, damage: number) => void, onHud: () => void): void {
    this.onHitEnemy = onHitEnemy;
    this.onHud = onHud;
  }

  /** Add reserve ammo (pickups). Returns amount actually taken. */
  addAmmo(amount: number): number {
    const before = this.reserve;
    const cap = this.stats.reserve * 2;
    this.reserve = Math.min(cap, this.reserve + amount);
    const taken = this.reserve - before;
    if (taken > 0) this.onHud?.();
    return taken;
  }

  tryFire(pressed: boolean, dt: number): void {
    if (!this.active) return;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.switchCooldown > 0) return;
    if (!pressed || this.reloading || this.mag <= 0 || this.fireCooldown > 0) {
      if (pressed && this.mag <= 0 && !this.reloading) this.startReload();
      return;
    }
    this.fire();
  }

  startReload(): void {
    if (!this.active) return;
    if (this.reloading || this.mag >= this.stats.magSize || this.reserve <= 0) return;
    this.reloading = true;
    this.ads = false;
    this.reloadTimer = this.stats.reloadTime;
    gameAudio.play('reload');
  }

  private fire(): void {
    this.mag -= 1;
    this.fireCooldown = 60 / this.stats.rpm;
    const recoilMul = this.ads ? this.stats.recoilAdsMul : 1;
    this.kick = 1;
    this.recoilPitch +=
      (this.stats.recoilPitch + Math.random() * this.stats.recoilPitch * 0.45) *
      recoilMul *
      this.motionScale;
    this.recoilYaw +=
      (Math.random() - 0.5) * this.stats.recoilYaw * recoilMul * this.motionScale;
    this.flashTimer = this.stats.kind === 'smg' ? 0.038 : 0.05;
    this.flashLight.intensity = this.stats.kind === 'smg' ? 12 : 16;
    (this.flash.material as THREE.MeshBasicMaterial).opacity = 1;
    (this.flashCore.material as THREE.MeshBasicMaterial).opacity = 1;
    this.flash.rotation.z = Math.random() * Math.PI;
    const flashScale = this.stats.kind === 'smg' ? 0.7 : 0.9;
    this.flash.scale.setScalar(flashScale + Math.random() * 0.55);
    this.flashCore.scale.setScalar(0.7 + Math.random() * 0.45);

    gameAudio.play(this.stats.kind === 'smg' ? 'gunshotSmg' : 'gunshot');

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
      this.effects.spawnBlood(impactPoint, impactNormal);
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
        gameAudio.play('kill');
      }
      this.onHitEnemy?.(hitEnemy, killed, this.stats.damage);
    }

    this.onHud?.();
  }

  update(dt: number, bobOffset: THREE.Vector3, isLocked: boolean): void {
    if (!this.active) return;

    this.switchCooldown = Math.max(0, this.switchCooldown - dt);

    const adsTarget = this.ads && !this.reloading && this.switchCooldown <= 0 ? 1 : 0;
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, adsTarget, 14, dt);
    if (this.ads && !this.wasAds) gameAudio.play('ads');
    this.wasAds = this.ads;

    const fov = THREE.MathUtils.lerp(this.stats.hipFov, this.stats.adsFov, this.adsBlend);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    this.idlePhase += dt;

    const [hipX, hipY, hipZ] = this.stats.hipPos;
    const [adsX, adsY, adsZ] = this.stats.adsPos;

    if (this.reloading) {
      this.reloadTimer -= dt;
      const t = 1 - this.reloadTimer / this.stats.reloadTime;
      this.viewModel.rotation.x = Math.sin(t * Math.PI) * (this.stats.kind === 'smg' ? 0.55 : 0.45);
      this.viewModel.position.y = hipY - Math.sin(t * Math.PI) * (this.stats.kind === 'smg' ? 0.14 : 0.12);
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

    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, this.stats.kind === 'smg' ? 14 : 10, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, this.stats.kind === 'smg' ? 12 : 10, dt);
    this.kick = THREE.MathUtils.damp(this.kick, 0, this.stats.kind === 'smg' ? 18 : 14, dt);

    if (isLocked) {
      this.camera.rotation.x += this.recoilPitch * 0.35;
      this.camera.rotation.y += this.recoilYaw * 0.35;
      this.camera.rotation.x = THREE.MathUtils.clamp(this.camera.rotation.x, -1.4, 1.4);
    }

    this.bob.copy(bobOffset);
    const bobScale = THREE.MathUtils.lerp(1, 0.22, this.adsBlend);
    const breathY = Math.sin(this.idlePhase * 1.4) * 0.004 * (1 - this.adsBlend * 0.7);
    const breathX = Math.sin(this.idlePhase * 0.9) * 0.0025 * (1 - this.adsBlend);
    if (!this.reloading) {
      const raise = this.switchCooldown > 0 ? (this.switchCooldown / 0.28) * 0.18 : 0;
      this.viewModel.position.set(
        THREE.MathUtils.lerp(hipX, adsX, this.adsBlend) + this.bob.x * 1.55 * bobScale + breathX,
        THREE.MathUtils.lerp(hipY, adsY, this.adsBlend) + this.bob.y * bobScale + breathY - raise,
        THREE.MathUtils.lerp(hipZ, adsZ, this.adsBlend) - this.kick * this.stats.kickAmount,
      );
      this.viewModel.rotation.set(
        this.kick * (this.stats.kind === 'smg' ? 0.04 : 0.05) + this.bob.y * 0.35 * bobScale,
        -this.bob.x * 0.95 * bobScale + breathX * 2,
        this.bob.x * 0.55 * bobScale - this.kick * 0.02,
      );
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const flashPeak = this.stats.kind === 'smg' ? 0.038 : 0.05;
      const flashInt = this.stats.kind === 'smg' ? 12 : 16;
      if (this.flashTimer <= 0) {
        (this.flash.material as THREE.MeshBasicMaterial).opacity = 0;
        (this.flashCore.material as THREE.MeshBasicMaterial).opacity = 0;
        this.flashLight.intensity = 0;
      } else {
        this.flashLight.intensity = flashInt * (this.flashTimer / flashPeak);
      }
    }
  }
}

/** @deprecated alias — Loop 5 name */
export type Rifle = Firearm;

export class WeaponLoadout {
  readonly weapons: Firearm[];
  private index = 0;
  private switchLock = 0;

  constructor(weapons: Firearm[]) {
    this.weapons = weapons;
    weapons.forEach((w, i) => w.setActive(i === 0));
  }

  get active(): Firearm {
    return this.weapons[this.index]!;
  }

  get slot(): number {
    return this.index + 1;
  }

  setMotionScale(scale: number): void {
    for (const w of this.weapons) w.setMotionScale(scale);
  }

  setWorldTargets(objects: THREE.Object3D[], enemies: EnemyTarget[]): void {
    for (const w of this.weapons) w.setWorldTargets(objects, enemies);
  }

  setCallbacks(onHitEnemy: (e: EnemyTarget, killed: boolean, damage: number) => void, onHud: () => void): void {
    for (const w of this.weapons) w.setCallbacks(onHitEnemy, onHud);
  }

  select(slot: number): boolean {
    const i = slot - 1;
    if (i < 0 || i >= this.weapons.length || i === this.index) return false;
    if (this.switchLock > 0) return false;
    if (this.active.reloading) return false;
    this.active.setAds(false);
    this.active.setActive(false);
    this.index = i;
    this.active.setActive(true);
    this.switchLock = 0.2;
    return true;
  }

  cycle(dir: number): boolean {
    const next = (this.index + (dir > 0 ? 1 : -1) + this.weapons.length) % this.weapons.length;
    return this.select(next + 1);
  }

  update(dt: number, bob: THREE.Vector3, locked: boolean): void {
    this.switchLock = Math.max(0, this.switchLock - dt);
    for (const w of this.weapons) w.update(dt, bob, locked);
  }

  tryFire(pressed: boolean, dt: number): void {
    this.active.tryFire(pressed, dt);
  }

  setAds(on: boolean): void {
    this.active.setAds(on);
  }

  startReload(): void {
    this.active.startReload();
  }

  /** Prefer active weapon; overflow goes to other if active full */
  collectAmmo(amount: number): number {
    let left = amount;
    let taken = this.active.addAmmo(left);
    left -= taken;
    if (left > 0) {
      for (const w of this.weapons) {
        if (w === this.active) continue;
        const t = w.addAmmo(left);
        taken += t;
        left -= t;
      }
    }
    return taken;
  }
}

export function createLoadout(
  camera: THREE.PerspectiveCamera,
  effects: CombatEffects,
  assets: SoldierAssets | null,
): WeaponLoadout {
  const rifle = new Firearm(camera, effects, RIFLE_STATS, buildRifleViewModel(), assets);
  const smg = new Firearm(camera, effects, SMG_STATS, buildSmgViewModel(), assets);
  if (assets?.ok) {
    console.info('[viewmodel] rifle+SMG procedural intentional; world GLB rifle on enemies');
  }
  return new WeaponLoadout([rifle, smg]);
}
