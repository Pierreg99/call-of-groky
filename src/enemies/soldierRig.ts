import * as THREE from 'three';
import type { SoldierAssets } from './gltfAssets';
import { cloneRifle } from './gltfAssets';

export type SoldierPose = 'idle' | 'aim' | 'fire' | 'walk' | 'cover' | 'death';

type Euler = [number, number, number];
type BonePose = Partial<
  Record<
    | 'hips'
    | 'spine'
    | 'chest'
    | 'head'
    | 'upperArmL'
    | 'lowerArmL'
    | 'upperArmR'
    | 'lowerArmR'
    | 'handR'
    | 'upperLegL'
    | 'lowerLegL'
    | 'upperLegR'
    | 'lowerLegR'
    | 'weapon',
    Euler
  >
>;

/** Combat-ready hold — never T-pose. */
const POSES: Record<SoldierPose, BonePose> = {
  idle: {
    spine: [0.04, 0, 0],
    chest: [0.02, 0.05, 0],
    head: [-0.02, 0.08, 0],
    upperArmL: [1.05, 0.25, 0.95],
    lowerArmL: [1.15, 0.1, 0],
    upperArmR: [1.15, -0.2, -0.65],
    lowerArmR: [1.25, 0.15, 0],
    handR: [0.15, 0.1, 0.25],
    upperLegL: [0.02, 0, 0.02],
    upperLegR: [-0.02, 0, -0.02],
    weapon: [0.2, 0.45, 0.05],
  },
  walk: {
    spine: [0.06, 0, 0],
    chest: [0.04, 0, 0],
    head: [0, 0.05, 0],
    upperArmL: [0.5, 0.1, 0.8],
    lowerArmL: [0.95, 0, 0],
    upperArmR: [0.7, -0.05, -0.5],
    lowerArmR: [1.0, 0.05, 0],
    handR: [0.05, 0, 0.15],
    weapon: [0.12, 0.3, -0.08],
  },
  aim: {
    spine: [0.1, 0, 0],
    chest: [0.12, 0, 0],
    head: [-0.1, 0, 0],
    upperArmL: [1.35, 0.1, 0.45],
    lowerArmL: [0.45, 0.2, 0],
    upperArmR: [1.45, -0.25, -0.25],
    lowerArmR: [0.25, 0.05, 0.15],
    handR: [0, 0.15, 0],
    upperLegL: [0.08, 0, 0.05],
    upperLegR: [-0.06, 0, -0.04],
    weapon: [0.1, -0.2, 0.15],
  },
  fire: {
    spine: [0.05, 0, 0],
    chest: [0.02, 0.02, 0],
    head: [-0.1, 0, 0],
    upperArmL: [1.1, 0.05, 0.55],
    lowerArmL: [0.5, 0.15, 0],
    upperArmR: [1.15, -0.2, -0.3],
    lowerArmR: [0.28, 0, 0.12],
    handR: [-0.08, 0.05, 0],
    weapon: [-0.05, 0.02, 0.08],
  },
  cover: {
    spine: [0.2, 0.1, 0],
    chest: [0.15, 0.12, 0],
    head: [0.05, 0.2, 0],
    upperArmL: [0.7, 0.2, 0.9],
    lowerArmL: [1.1, 0, 0],
    upperArmR: [0.9, 0, -0.7],
    lowerArmR: [1.2, 0.2, 0],
    handR: [0.2, 0, 0.25],
    upperLegL: [0.35, 0, 0.05],
    lowerLegL: [0.55, 0, 0],
    upperLegR: [0.5, 0, -0.05],
    lowerLegR: [0.7, 0, 0],
    weapon: [0.25, 0.4, 0.1],
  },
  death: {
    hips: [1.05, 0.15, 0.12],
    spine: [0.35, 0.25, -0.15],
    chest: [0.25, -0.15, 0.12],
    head: [0.45, 0.35, -0.25],
    upperArmL: [-0.35, 0.55, 1.1],
    lowerArmL: [0.25, 0, 0],
    upperArmR: [-0.45, -0.45, -1.0],
    lowerArmR: [0.2, 0, 0],
    upperLegL: [0.55, 0.15, 0.25],
    lowerLegL: [0.85, 0, 0],
    upperLegR: [0.35, -0.2, -0.15],
    lowerLegR: [0.65, 0, 0],
    weapon: [0.4, 1.0, 0.7],
  },
};



function mkBone(name: string): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  return o;
}

export interface SoldierRig {
  root: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  muzzleLocal: THREE.Vector3;
  fromGltf: boolean;
  setPose: (pose: SoldierPose, immediate?: boolean) => void;
  update: (dt: number, time: number, moving: boolean) => void;
  applyDeath: (dt: number, deathT: number) => void;
}

function dampEuler(obj: THREE.Object3D, e: Euler | undefined, fallback: Euler, k: number, dt: number): void {
  const t = e ?? fallback;
  obj.rotation.x = THREE.MathUtils.damp(obj.rotation.x, t[0], k, dt);
  obj.rotation.y = THREE.MathUtils.damp(obj.rotation.y, t[1], k, dt);
  obj.rotation.z = THREE.MathUtils.damp(obj.rotation.z, t[2], k, dt);
}

function snapEuler(obj: THREE.Object3D, e: Euler | undefined, fallback: Euler = [0, 0, 0]): void {
  const t = e ?? fallback;
  obj.rotation.set(t[0], t[1], t[2]);
}

export function createSoldierRig(
  assets: SoldierAssets | null,
  mats: {
    body: THREE.MeshStandardMaterial;
    armor: THREE.MeshStandardMaterial;
    helmet: THREE.MeshStandardMaterial;
    skin: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    gun: THREE.MeshStandardMaterial;
  },
): SoldierRig {
  const root = new THREE.Group();
  root.name = 'SoldierRig';
  const materials: THREE.MeshStandardMaterial[] = [
    mats.body,
    mats.armor,
    mats.helmet,
    mats.skin,
    mats.accent,
    mats.gun,
  ];

  const hips = mkBone('hips');
  hips.position.y = 0.95;
  const spine = mkBone('spine');
  spine.position.y = 0.16;
  const chest = mkBone('chest');
  chest.position.y = 0.2;
  const head = mkBone('head');
  head.position.y = 0.26;
  const upperArmL = mkBone('upperArmL');
  upperArmL.position.set(-0.22, 0.16, 0);
  const lowerArmL = mkBone('lowerArmL');
  lowerArmL.position.y = -0.24;
  const upperArmR = mkBone('upperArmR');
  upperArmR.position.set(0.22, 0.16, 0);
  const lowerArmR = mkBone('lowerArmR');
  lowerArmR.position.y = -0.24;
  const handR = mkBone('handR');
  handR.position.y = -0.22;
  const upperLegL = mkBone('upperLegL');
  upperLegL.position.set(-0.11, 0, 0);
  const lowerLegL = mkBone('lowerLegL');
  lowerLegL.position.y = -0.42;
  const upperLegR = mkBone('upperLegR');
  upperLegR.position.set(0.11, 0, 0);
  const lowerLegR = mkBone('lowerLegR');
  lowerLegR.position.y = -0.42;
  const weapon = mkBone('weapon');
  weapon.position.set(0.0, -0.02, 0.1);

  root.add(hips);
  hips.add(spine, upperLegL, upperLegR);
  spine.add(chest);
  chest.add(head, upperArmL, upperArmR);
  upperArmL.add(lowerArmL);
  upperArmR.add(lowerArmR);
  lowerArmR.add(handR);
  handR.add(weapon);
  upperLegL.add(lowerLegL);
  upperLegR.add(lowerLegR);

  // CC0 slim GLB has no skin weights — hierarchical *procedural* body carries
  // idle/walk/aim/fire/cover/death poses. GLB contributes the assault rifle only.
  let fromGltf = false;

  if (assets?.ok) {
    try {
      const rifle = cloneRifle(assets);
      rifle.updateMatrixWorld(true);
      const rb = new THREE.Box3().setFromObject(rifle);
      const rs = rb.getSize(new THREE.Vector3());
      const longest = Math.max(rs.x, rs.y, rs.z, 0.01);
      rifle.scale.multiplyScalar(0.85 / longest);
      // Darken / unify rifle mats for readability under HDRI
      rifle.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.material) return;
        const apply = (mat: THREE.Material) => {
          const std = (mat as THREE.MeshStandardMaterial).clone() as THREE.MeshStandardMaterial;
          if (std.isMeshStandardMaterial) {
            std.color.setHex(0x1c2228);
            std.metalness = 0.75;
            std.roughness = 0.4;
            std.envMapIntensity = 1.0;
          }
          return std;
        };
        m.material = Array.isArray(m.material) ? m.material.map(apply) : apply(m.material);
      });
      rifle.rotation.set(-0.15, Math.PI / 2, 0.1);
      rifle.position.set(0.05, 0.02, 0.15);
      weapon.add(rifle);
      fromGltf = true; // means GLB rifle attached (body still procedural hierarchy)
    } catch (err) {
      console.warn('[soldierRig] GLB rifle attach failed', err);
    }
  }

  {
    // Always build hierarchical procedural body (poses live here)
    const box = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
    };
    box(hips, 0.42, 0.2, 0.26, mats.armor, 0, 0, 0);
    box(spine, 0.38, 0.26, 0.24, mats.body, 0, 0.04, 0);
    box(chest, 0.48, 0.32, 0.28, mats.body, 0, 0.04, 0);
    box(chest, 0.4, 0.26, 0.1, mats.armor, 0, 0.02, 0.12);
    box(head, 0.26, 0.24, 0.26, mats.skin, 0, 0.08, 0.02);
    box(head, 0.3, 0.14, 0.32, mats.helmet, 0, 0.2, 0.02);
    box(upperArmL, 0.12, 0.32, 0.14, mats.body, 0, -0.12, 0);
    box(lowerArmL, 0.1, 0.28, 0.12, mats.body, 0, -0.12, 0);
    box(upperArmR, 0.12, 0.32, 0.14, mats.body, 0, -0.12, 0);
    box(lowerArmR, 0.1, 0.28, 0.12, mats.body, 0, -0.12, 0);
    box(upperLegL, 0.16, 0.4, 0.18, mats.body, 0, -0.18, 0);
    box(lowerLegL, 0.14, 0.36, 0.16, mats.body, 0, -0.16, 0);
    box(upperLegR, 0.16, 0.4, 0.18, mats.body, 0, -0.18, 0);
    box(lowerLegR, 0.14, 0.36, 0.16, mats.body, 0, -0.16, 0);
    box(lowerLegL, 0.16, 0.1, 0.28, mats.armor, 0, -0.38, 0.04);
    box(lowerLegR, 0.16, 0.1, 0.28, mats.armor, 0, -0.38, 0.04);
    if (weapon.children.length === 0) {
      const recv = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.42), mats.gun);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.28, 6), mats.gun);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.01, -0.32);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.16), mats.gun);
      stock.position.set(0, -0.01, 0.26);
      weapon.add(recv, barrel, stock);
    }
  }

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.04), mats.accent);
  stripe.position.set(0, 0.06, 0.16);
  chest.add(stripe);

  const ZERO: Euler = [0, 0, 0];
  let targetPose: SoldierPose = 'idle';
  let firePulse = 0;
  let walkPhase = 0;

  const apply = (pose: BonePose, immediate: boolean, dt: number) => {
    const k = immediate ? 80 : 14;
    const run = immediate
      ? (o: THREE.Object3D, e?: Euler) => snapEuler(o, e)
      : (o: THREE.Object3D, e?: Euler) => dampEuler(o, e, ZERO, k, dt);
    run(hips, pose.hips);
    run(spine, pose.spine);
    run(chest, pose.chest);
    run(head, pose.head);
    run(upperArmL, pose.upperArmL);
    run(lowerArmL, pose.lowerArmL);
    run(upperArmR, pose.upperArmR);
    run(lowerArmR, pose.lowerArmR);
    run(handR, pose.handR);
    run(upperLegL, pose.upperLegL);
    run(lowerLegL, pose.lowerLegL);
    run(upperLegR, pose.upperLegR);
    run(lowerLegR, pose.lowerLegR);
    run(weapon, pose.weapon);
  };
  apply(POSES.idle, true, 0.016);

  return {
    root,
    materials,
    muzzleLocal: new THREE.Vector3(0.28, 1.2, 0.55),
    fromGltf,
    setPose(pose, immediate = false) {
      targetPose = pose;
      if (pose === 'fire') firePulse = 1;
      if (immediate) apply(POSES[pose], true, 0.016);
    },
    update(dt, time, moving) {
      firePulse = Math.max(0, firePulse - dt * 8);
      let pose = targetPose;
      // Never override aim/fire/cover/death with walk (residual velocity used to steal aim)
      if (pose === 'idle' && moving) pose = 'walk';
      if (firePulse > 0.15 && pose !== 'death' && pose !== 'cover') pose = 'fire';
      apply(POSES[pose], false, dt);

      if (pose === 'idle' || pose === 'aim') {
        spine.rotation.x += Math.sin(time * 1.6) * 0.012;
        chest.rotation.y += Math.sin(time * 1.1) * 0.018;
      }
      if (pose === 'walk' || (moving && pose !== 'death' && pose !== 'cover')) {
        walkPhase += dt * 7.2;
        const swing = Math.sin(walkPhase) * 0.48;
        upperLegL.rotation.x = swing;
        upperLegR.rotation.x = -swing;
        lowerLegL.rotation.x = Math.max(0, -swing) * 0.65;
        lowerLegR.rotation.x = Math.max(0, swing) * 0.65;
        hips.position.y = 0.95 + Math.abs(Math.sin(walkPhase * 2)) * 0.028;
      } else if (pose !== 'death') {
        hips.position.y = THREE.MathUtils.damp(hips.position.y, pose === 'cover' ? 0.72 : 0.95, 8, dt);
      }
    },
    applyDeath(dt, deathT) {
      targetPose = 'death';
      apply(POSES.death, false, dt);
      root.rotation.x = THREE.MathUtils.damp(root.rotation.x, Math.PI * 0.5, 5, dt);
      root.rotation.z = THREE.MathUtils.damp(root.rotation.z, 0.4 * Math.sin(deathT * 1.8), 4, dt);
      hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.32, 4, dt);
      root.position.y = THREE.MathUtils.damp(root.position.y, 0.04, 3, dt);
    },
  };
}
