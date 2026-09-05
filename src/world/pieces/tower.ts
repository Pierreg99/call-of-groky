import * as THREE from 'three';
import { createAccentEmissive } from '../materials';
import type { FloorPad } from '../../player/fpsController';
import type { CoverPoint } from '../../enemies/target';
import { boxMesh, addCollider, addFloorPad, contactBlob, floorDecal } from './helpers';

export interface TowerBuildArgs {
  root: THREE.Group;
  scene: THREE.Scene;
  colliders: THREE.Box3[];
  floors: FloorPad[];
  coverPoints: CoverPoint[];
  dark: THREE.Material;
  metal: THREE.Material;
  concrete: THREE.Material;
  rust: THREE.Material;
  lamp: THREE.Material;
  warn: THREE.Material;
  neonCyan: THREE.Material;
  neonOrange: THREE.Material;
  towerX?: number;
  towerZ?: number;
}

/** Modular control-tower piece (was inline greybox monolith). */
export function buildControlTower(args: TowerBuildArgs): THREE.Vector3 {
  const {
    root, scene, colliders, floors, coverPoints,
    dark, metal, concrete, rust, lamp, warn, neonCyan, neonOrange,
  } = args;
  const towerX = args.towerX ?? 12;
  const towerZ = args.towerZ ?? -18;
  const towerCenter = new THREE.Vector3(towerX, 0, towerZ);

  const twWalls: Array<[number, number, number, number, number, number, THREE.Material]> = [
    [8.5, 5.5, 0.55, towerX, 2.75, towerZ - 3.6, dark],
    [0.55, 5.5, 7.5, towerX - 4.1, 2.75, towerZ, dark],
    [0.55, 5.5, 7.5, towerX + 4.1, 2.75, towerZ, dark],
    [2.8, 5.5, 0.55, towerX - 2.6, 2.75, towerZ + 3.6, dark],
    [2.8, 5.5, 0.55, towerX + 2.6, 2.75, towerZ + 3.6, dark],
  ];
  for (const [w, h, d, x, y, z, mat] of twWalls) {
    const m = boxMesh(w, h, d, mat, x, y, z);
    root.add(m);
    addCollider(colliders, m);
  }
  const twLintel = boxMesh(2.6, 1.4, 0.55, metal, towerX, 4.6, towerZ + 3.6);
  root.add(twLintel);
  addCollider(colliders, twLintel);

  root.add(boxMesh(8.8, 0.2, 0.35, neonCyan, towerX, 5.7, towerZ + 3.75, false, false));
  root.add(boxMesh(0.12, 3.6, 0.12, neonOrange, towerX - 1.15, 1.9, towerZ + 3.9, false, false));
  root.add(boxMesh(0.12, 3.6, 0.12, neonOrange, towerX + 1.15, 1.9, towerZ + 3.9, false, false));
  root.add(boxMesh(3.2, 0.9, 0.12, dark, towerX, 3.0, towerZ + 3.95, false, true));
  root.add(boxMesh(2.8, 0.12, 0.06, neonCyan, towerX, 3.35, towerZ + 4.02, false, false));
  root.add(boxMesh(2.4, 0.45, 0.05, warn, towerX, 2.85, towerZ + 4.01, false, false));
  root.add(boxMesh(9.0, 0.25, 8.0, metal, towerX, 5.65, towerZ, true, true));

  const deck = boxMesh(7.6, 0.35, 6.8, concrete, towerX, 3.35, towerZ);
  root.add(deck);
  addCollider(colliders, deck);
  addFloorPad(floors, deck, 0.1);
  contactBlob(root, towerX, towerZ, 4.0, 0.28);

  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const z = towerZ + 2.8 - t * 4.2;
    const y = 0.22 + t * 3.0;
    const step = boxMesh(1.6, 0.18, 0.55, metal, towerX - 2.4, y, z);
    root.add(step);
    addCollider(colliders, step);
    floors.push({
      minX: towerX - 3.15,
      maxX: towerX - 1.65,
      minZ: z - 0.35,
      maxZ: z + 0.35,
      topY: y + 0.09,
    });
  }
  root.add(boxMesh(0.08, 3.2, 0.08, neonCyan, towerX - 1.55, 1.8, towerZ + 0.4, false, false));
  root.add(boxMesh(0.08, 3.2, 0.08, neonCyan, towerX - 3.2, 1.8, towerZ + 0.4, false, false));

  const consoleA = boxMesh(2.4, 1.05, 0.7, metal, towerX + 1.2, 3.9, towerZ - 2.4);
  root.add(consoleA);
  addCollider(colliders, consoleA);
  root.add(boxMesh(2.1, 0.55, 0.08, lamp, towerX + 1.2, 4.55, towerZ - 2.05, false, false));
  root.add(boxMesh(0.9, 0.45, 0.06, neonOrange, towerX + 0.5, 4.5, towerZ - 2.02, false, false));
  root.add(boxMesh(0.9, 0.45, 0.06, neonCyan, towerX + 1.8, 4.5, towerZ - 2.02, false, false));

  const consoleB = boxMesh(1.6, 0.9, 0.55, rust, towerX - 0.8, 3.85, towerZ - 1.0);
  root.add(consoleB);
  addCollider(colliders, consoleB);
  root.add(boxMesh(1.2, 0.35, 0.05, warn, towerX - 0.8, 4.4, towerZ - 0.7, false, false));

  for (const ox of [-2.2, 0, 2.2]) {
    root.add(boxMesh(1.6, 1.2, 0.12, metal, towerX + ox, 4.6, towerZ - 3.28, false, true));
    root.add(
      boxMesh(1.35, 0.95, 0.04, createAccentEmissive(0x3a90b8, 0.55), towerX + ox, 4.6, towerZ - 3.22, false, false),
    );
  }

  const mast = boxMesh(0.18, 3.2, 0.18, metal, towerX + 2.8, 6.5, towerZ - 2.5);
  root.add(mast);
  root.add(boxMesh(0.9, 0.08, 0.08, neonOrange, towerX + 2.8, 8.0, towerZ - 2.5, false, false));
  root.add(boxMesh(0.08, 0.08, 0.9, neonCyan, towerX + 2.8, 7.6, towerZ - 2.5, false, false));

  for (const [wx, wz, wh] of [
    [towerX + 2.5, towerZ + 1.2, 2.4],
    [towerX + 2.5, towerZ - 0.6, 2.8],
    [towerX + 1.0, towerZ + 1.5, 1.8],
  ] as const) {
    const shelf = boxMesh(1.4, wh, 0.7, rust, wx, wh / 2, wz);
    root.add(shelf);
    addCollider(colliders, shelf);
    contactBlob(root, wx, wz, 0.9, 0.35);
    for (let s = 0; s < 3; s++) {
      root.add(boxMesh(1.25, 0.06, 0.6, metal, wx, 0.45 + s * (wh / 3.2), wz, true, true));
    }
  }

  floorDecal(root, 6.5, 5.5, towerX, towerZ, 0x1a1e24, 0.28);
  floorDecal(root, 5.5, 0.3, towerX, towerZ + 3.2, 0xc4a030, 0.5);
  floorDecal(root, 2.2, 1.4, towerX + 1.5, towerZ - 1.5, 0x0e0e12, 0.45);

  coverPoints.push(
    { pos: new THREE.Vector3(towerX - 1.5, 0, towerZ + 2.0), facing: new THREE.Vector3(0, 0, 1) },
    { pos: new THREE.Vector3(towerX + 1.5, 3.5, towerZ - 1.2), facing: new THREE.Vector3(0, 0, 1) },
    { pos: new THREE.Vector3(towerX, 3.5, towerZ + 1.5), facing: new THREE.Vector3(0, 0, 1) },
  );

  const twLamp = new THREE.PointLight(0x7ad7ff, 16, 18, 2);
  twLamp.position.set(towerX, 5.2, towerZ);
  scene.add(twLamp);
  const twWarn = new THREE.PointLight(0xff6a3d, 9, 12, 2);
  twWarn.position.set(towerX + 1.2, 4.8, towerZ - 2.0);
  scene.add(twWarn);
  const twDoor = new THREE.PointLight(0xffc08a, 8, 12, 2);
  twDoor.position.set(towerX, 2.4, towerZ + 2.8);
  scene.add(twDoor);
  root.add(boxMesh(0.7, 0.1, 0.3, lamp, towerX, 5.4, towerZ, false, false));

  return towerCenter;
}
