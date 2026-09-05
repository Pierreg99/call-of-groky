import * as THREE from 'three';
import {
  createConcreteMaterial,
  createDarkConcrete,
  createMetalMaterial,
  createRustMetal,
  createFloorMaterial,
  createAccentEmissive,
  createNeonStrip,
} from './materials';
import type { FloorPad } from '../player/fpsController';

export interface ArenaBuild {
  root: THREE.Group;
  colliders: THREE.Box3[];
  floors: FloorPad[];
  spawnPoints: THREE.Vector3[];
}

function boxMesh(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  cast = true,
  receive = true,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function addCollider(list: THREE.Box3[], mesh: THREE.Mesh): void {
  mesh.updateMatrixWorld(true);
  list.push(new THREE.Box3().setFromObject(mesh));
}

function addFloorPad(floors: FloorPad[], mesh: THREE.Mesh, inset = 0.05): void {
  mesh.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(mesh);
  floors.push({
    minX: b.min.x + inset,
    maxX: b.max.x - inset,
    minZ: b.min.z + inset,
    maxZ: b.max.z - inset,
    topY: b.max.y,
  });
}

export function buildArena(scene: THREE.Scene, shadowMapSize = 2048): ArenaBuild {
  const root = new THREE.Group();
  root.name = 'arena';
  const colliders: THREE.Box3[] = [];
  const floors: FloorPad[] = [];

  const concrete = createConcreteMaterial();
  const dark = createDarkConcrete();
  const metal = createMetalMaterial();
  const rust = createRustMetal();
  const floorMat = createFloorMaterial();
  const lamp = createAccentEmissive(0x5ce1ff, 1.6);
  const warn = createAccentEmissive(0xff6a3d, 1.3);
  const neonCyan = createNeonStrip(0x5ce1ff, 2.4);
  const neonOrange = createNeonStrip(0xff6a3d, 2.0);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const wallH = 5.5;
  const walls: Array<[number, number, number, number, number, number]> = [
    [60, wallH, 1.2, 0, wallH / 2, -30],
    [60, wallH, 1.2, 0, wallH / 2, 30],
    [1.2, wallH, 60, -30, wallH / 2, 0],
    [1.2, wallH, 60, 30, wallH / 2, 0],
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const m = boxMesh(w, h, d, dark, x, y, z);
    root.add(m);
    addCollider(colliders, m);
  }

  for (const [x, z] of [
    [-6, -6],
    [6, -6],
    [-6, 6],
    [6, 6],
  ] as const) {
    const p = boxMesh(1.4, 4.2, 1.4, concrete, x, 2.1, z);
    root.add(p);
    addCollider(colliders, p);
    const cap = boxMesh(1.8, 0.25, 1.8, metal, x, 4.3, z, true, false);
    root.add(cap);
    const ring = boxMesh(1.5, 0.06, 1.5, neonCyan, x, 0.08, z, false, false);
    root.add(ring);
  }

  const roomA: Array<[number, number, number, number, number, number, THREE.Material]> = [
    [10, 4, 0.6, -18, 2, -10, concrete],
    [10, 4, 0.6, -18, 2, 2, concrete],
    [0.6, 4, 12.6, -23, 2, -4, concrete],
    [0.6, 4, 5, -13, 2, -8, concrete],
    [0.6, 4, 5, -13, 2, 0, concrete],
  ];
  for (const [w, h, d, x, y, z, mat] of roomA) {
    const m = boxMesh(w, h, d, mat, x, y, z);
    root.add(m);
    addCollider(colliders, m);
  }
  const lintel = boxMesh(0.6, 1.2, 2.6, metal, -13, 3.4, -4);
  root.add(lintel);
  addCollider(colliders, lintel);

  const hangarBack = boxMesh(14, 5, 0.7, dark, 18, 2.5, -12);
  root.add(hangarBack);
  addCollider(colliders, hangarBack);
  const hangarSide = boxMesh(0.7, 5, 16, dark, 25, 2.5, -4);
  root.add(hangarSide);
  addCollider(colliders, hangarSide);
  const hangarFrontL = boxMesh(5, 5, 0.7, dark, 12, 2.5, 4);
  root.add(hangarFrontL);
  addCollider(colliders, hangarFrontL);
  const hangarFrontR = boxMesh(5, 5, 0.7, dark, 22, 2.5, 4);
  root.add(hangarFrontR);
  addCollider(colliders, hangarFrontR);

  // Neon door frame accents
  root.add(boxMesh(0.08, 2.4, 0.08, neonOrange, -13, 1.2, -5.2, false, false));
  root.add(boxMesh(0.08, 2.4, 0.08, neonOrange, -13, 1.2, -2.8, false, false));

  const covers: Array<[number, number, number, number, number, number, THREE.Material]> = [
    [2.4, 1.4, 1.2, -2, 0.7, 2, metal],
    [1.2, 1.8, 2.2, 3, 0.9, -3, rust],
    [2.8, 1.2, 1.4, 14, 0.6, -2, metal],
    [1.6, 2.2, 1.6, 17, 1.1, -6, rust],
    [3.2, 1.0, 1.4, -16, 0.5, -4, metal],
    [1.3, 1.3, 2.6, -8, 0.65, 10, concrete],
    [2.0, 1.6, 2.0, 8, 0.8, 12, rust],
    [4.0, 0.9, 1.2, 0, 0.45, -14, metal],
  ];
  for (const [w, h, d, x, y, z, mat] of covers) {
    const m = boxMesh(w, h, d, mat, x, y, z);
    root.add(m);
    addCollider(colliders, m);
  }

  const platform = boxMesh(8, 0.4, 6, concrete, -4, 1.4, 18);
  root.add(platform);
  addCollider(colliders, platform);
  addFloorPad(floors, platform);

  const ramp = boxMesh(3, 0.35, 5, metal, -4, 0.7, 13.5);
  ramp.rotation.x = -0.35;
  root.add(ramp);
  // Approximate ramp as stepped floor pads
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const z = 13.5 - 2.2 + t * 4.4;
    const y = 0.35 + t * 1.05;
    floors.push({
      minX: -5.4,
      maxX: -2.6,
      minZ: z - 0.55,
      maxZ: z + 0.55,
      topY: y,
    });
  }

  const midWall = boxMesh(12, 2.2, 0.5, concrete, 2, 1.1, -8);
  root.add(midWall);
  addCollider(colliders, midWall);
  const midGapL = boxMesh(3, 2.2, 0.5, concrete, -8, 1.1, -8);
  root.add(midGapL);
  addCollider(colliders, midGapL);

  // Neon strip along mid barrier
  root.add(boxMesh(11.5, 0.05, 0.08, neonCyan, 2, 2.25, -8, false, false));

  for (let i = -2; i <= 2; i++) {
    const beam = boxMesh(0.35, 0.35, 24, metal, i * 5, 5.2, 0, false, true);
    root.add(beam);
  }

  const fixtures: Array<[number, number, number, THREE.Material]> = [
    [-18, 3.8, -4, lamp],
    [18, 4.2, -4, lamp],
    [0, 4.8, 0, warn],
    [-4, 3.2, 18, lamp],
    [8, 3.5, 10, lamp],
  ];
  for (const [x, y, z, mat] of fixtures) {
    const f = boxMesh(0.8, 0.12, 0.35, mat, x, y, z, false, false);
    root.add(f);
  }

  const hemi = new THREE.HemisphereLight(0x8ba3c7, 0x1a1510, 0.5);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe2c4, 2.0);
  sun.position.set(18, 28, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 0, 0);

  const points: Array<[number, number, number, number, number]> = [
    [-18, 3.5, -4, 0x7ad7ff, 9],
    [18, 4.0, -3, 0x7ad7ff, 11],
    [0, 3.2, 12, 0xff9a5c, 6.5],
    [-6, 2.8, 18, 0x9ad0ff, 5.5],
  ];
  for (const [x, y, z, color, intensity] of points) {
    const pl = new THREE.PointLight(color, intensity, 18, 2);
    pl.position.set(x, y, z);
    pl.castShadow = false;
    scene.add(pl);
  }

  const fill = new THREE.DirectionalLight(0x4a6a9a, 0.32);
  fill.position.set(-20, 10, -15);
  scene.add(fill);

  scene.add(root);

  const spawnPoints = [
    new THREE.Vector3(-16, 0, -4),
    new THREE.Vector3(16, 0, -2),
    new THREE.Vector3(6, 0, 10),
    new THREE.Vector3(-8, 0, 12),
    new THREE.Vector3(2, 0, -16),
  ];

  return { root, colliders, floors, spawnPoints };
}
