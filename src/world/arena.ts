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
import type { CoverPoint } from '../enemies/target';

export interface ArenaBuild {
  root: THREE.Group;
  colliders: THREE.Box3[];
  floors: FloorPad[];
  spawnPoints: THREE.Vector3[];
  coverPoints: CoverPoint[];
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

function contactBlob(root: THREE.Group, x: number, z: number, r: number, opacity = 0.35): void {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.015, z);
  m.renderOrder = 1;
  root.add(m);
}

function floorDecal(
  root: THREE.Group,
  w: number,
  d: number,
  x: number,
  z: number,
  color: number,
  opacity: number,
  rotY = 0,
): void {
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.95,
    metalness: 0.05,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rotY;
  m.position.set(x, 0.02, z);
  m.receiveShadow = true;
  m.renderOrder = 2;
  root.add(m);
}

export function buildArena(scene: THREE.Scene, shadowMapSize = 2048): ArenaBuild {
  const root = new THREE.Group();
  root.name = 'arena';
  const colliders: THREE.Box3[] = [];
  const floors: FloorPad[] = [];
  const coverPoints: CoverPoint[] = [];

  const concrete = createConcreteMaterial();
  const dark = createDarkConcrete();
  const metal = createMetalMaterial();
  const rust = createRustMetal();
  const floorMat = createFloorMaterial();
  const lamp = createAccentEmissive(0x5ce1ff, 1.35);
  const warn = createAccentEmissive(0xff6a3d, 1.1);
  const neonCyan = createNeonStrip(0x5ce1ff, 2.0);
  const neonOrange = createNeonStrip(0xff6a3d, 1.7);

  const floorGeo = new THREE.PlaneGeometry(60, 60);
  floorGeo.setAttribute('uv2', floorGeo.attributes.uv.clone());
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Floor detail: grit panels + caution / oil / scorch decals
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -2; iz <= 2; iz++) {
      if ((ix + iz) % 2 === 0) continue;
      floorDecal(root, 3.2, 3.2, ix * 6.5, iz * 6.5, 0x2a2e34, 0.22);
    }
  }
  floorDecal(root, 8, 0.35, 0, 2.5, 0xc4a030, 0.45); // caution stripe
  floorDecal(root, 8, 0.35, 0, 3.1, 0x1a1a1a, 0.5);
  floorDecal(root, 4.5, 2.2, -10, -2, 0x1a1208, 0.4, 0.4); // oil
  floorDecal(root, 3.2, 1.8, 12, -1, 0x181410, 0.35, -0.3);
  floorDecal(root, 2.4, 2.4, 5, 8, 0x0e0e10, 0.5); // scorch
  floorDecal(root, 1.6, 5, 18, -6, 0x3a3020, 0.3, 0.1);
  floorDecal(root, 6, 0.25, -18, -4, 0x5ce1ff, 0.25); // neon floor bleed

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
    contactBlob(root, x, z, 1.0, 0.4);
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

  root.add(boxMesh(0.08, 2.4, 0.08, neonOrange, -13, 1.2, -5.2, false, false));
  root.add(boxMesh(0.08, 2.4, 0.08, neonOrange, -13, 1.2, -2.8, false, false));

  // Cover crates — taller duckable props + nav cover points on safe side
  const covers: Array<[number, number, number, number, number, number, THREE.Material]> = [
    [2.4, 1.4, 1.2, -2, 0.7, 2, metal],
    [1.2, 1.8, 2.2, 3, 0.9, -3, rust],
    [2.8, 1.2, 1.4, 14, 0.6, -2, metal],
    [1.6, 2.2, 1.6, 17, 1.1, -6, rust],
    [3.2, 1.0, 1.4, -16, 0.5, -4, metal],
    [1.3, 1.3, 2.6, -8, 0.65, 10, concrete],
    [2.0, 1.6, 2.0, 8, 0.8, 12, rust],
    [4.0, 0.9, 1.2, 0, 0.45, -14, metal],
    // Loop 3 extra cover density
    [1.8, 1.5, 1.1, 5.5, 0.75, 7.5, metal],
    [1.4, 1.7, 1.4, -3.5, 0.85, 8.5, rust],
    [2.2, 1.3, 1.0, 10, 0.65, 5, metal],
    [1.5, 1.9, 1.2, -10, 0.95, 5, concrete],
    [1.1, 1.4, 2.0, 1.5, 0.7, -5, rust],
  ];
  for (const [w, h, d, x, y, z, mat] of covers) {
    const m = boxMesh(w, h, d, mat, x, y, z);
    root.add(m);
    addCollider(colliders, m);
    contactBlob(root, x, z, Math.max(w, d) * 0.55, 0.4);
    // Stacked small crate on some covers
    if (h >= 1.4 && w >= 1.4) {
      const top = boxMesh(w * 0.55, 0.55, d * 0.55, rust, x + 0.15, y + h / 2 + 0.28, z - 0.1);
      root.add(top);
      addCollider(colliders, top);
    }
  }

  // Cover nav points — stand just behind crate toward courtyard center
  const coverDefs: Array<[number, number, number, number]> = [
    [-2, 3.2, 0, 1],
    [3, -4.5, 0, -1],
    [5.5, 6.2, 0, -1],
    [-3.5, 7.2, 0, -1],
    [10, 3.7, 0, -1],
    [-10, 3.7, 0, -1],
    [8, 10.5, 0, -1],
    [-8, 8.5, 0, -1],
    [14, -3.5, -1, 0],
    [1.5, -6.5, 0, 1],
    [0, -12.5, 0, 1],
    [-16, -2.5, 1, 0],
  ];
  for (const [x, z, fx, fz] of coverDefs) {
    coverPoints.push({
      pos: new THREE.Vector3(x, 0, z),
      facing: new THREE.Vector3(fx, 0, fz).normalize(),
    });
  }

  const platform = boxMesh(8, 0.4, 6, concrete, -4, 1.4, 18);
  root.add(platform);
  addCollider(colliders, platform);
  addFloorPad(floors, platform);
  contactBlob(root, -4, 18, 4.2, 0.25);

  const ramp = boxMesh(3, 0.35, 5, metal, -4, 0.7, 13.5);
  ramp.rotation.x = -0.35;
  root.add(ramp);
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
  contactBlob(root, 2, -8, 6, 0.3);
  const midGapL = boxMesh(3, 2.2, 0.5, concrete, -8, 1.1, -8);
  root.add(midGapL);
  addCollider(colliders, midGapL);

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
    [5, 3.0, 7, lamp],
  ];
  for (const [x, y, z, mat] of fixtures) {
    const f = boxMesh(0.8, 0.12, 0.35, mat, x, y, z, false, false);
    root.add(f);
  }

  // --- Lighting punch: darker ambient, hard key, cyan rim, tuned contact shadows ---
  const hemi = new THREE.HemisphereLight(0x6a82a0, 0x0e0c0a, 0.28);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe6c8, 2.85);
  sun.position.set(20, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  // Tighter contact: lower bias + slight normalBias
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.028;
  sun.shadow.radius = shadowMapSize <= 512 ? 1.5 : 2.2;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 0, 0);

  // Cool rim from opposite side (neon vs concrete contrast)
  const rim = new THREE.DirectionalLight(0x5ce1ff, 0.55);
  rim.position.set(-22, 12, -18);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x3a5070, 0.18);
  fill.position.set(-12, 8, 20);
  scene.add(fill);

  const points: Array<[number, number, number, number, number]> = [
    [-18, 3.5, -4, 0x7ad7ff, 11],
    [18, 4.0, -3, 0x7ad7ff, 13],
    [0, 3.2, 12, 0xff9a5c, 7.5],
    [-6, 2.8, 18, 0x9ad0ff, 6],
    [5, 2.6, 7, 0xff6a3d, 5],
  ];
  for (const [x, y, z, color, intensity] of points) {
    const pl = new THREE.PointLight(color, intensity, 16, 2);
    pl.position.set(x, y, z);
    pl.castShadow = false;
    scene.add(pl);
  }

  scene.add(root);

  const spawnPoints = [
    new THREE.Vector3(-16, 0, -4),
    new THREE.Vector3(16, 0, -2),
    new THREE.Vector3(6, 0, 10),
    new THREE.Vector3(-8, 0, 12),
    new THREE.Vector3(2, 0, -16),
  ];

  return { root, colliders, floors, spawnPoints, coverPoints };
}
