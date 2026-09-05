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
import { boxMesh, addCollider, contactBlob, floorDecal } from './pieces/helpers';
import { buildControlTower } from './pieces/tower';
import { buildCoverClusters } from './pieces/cover';
import { buildRampPlatform } from './pieces/ramp';
import { buildWindowWall } from './pieces/windowWall';
import { buildHangar } from './pieces/hangar';
import { buildBunker } from './pieces/bunker';

export interface AmmoPickup {
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  amount: number;
  taken: boolean;
}

export interface ArenaBuild {
  root: THREE.Group;
  colliders: THREE.Box3[];
  floors: FloorPad[];
  spawnPoints: THREE.Vector3[];
  coverPoints: CoverPoint[];
  ammoPickups: AmmoPickup[];
  /** Landmark focus for compass / objective marker */
  objectivePoint: THREE.Vector3;
  towerCenter: THREE.Vector3;
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

  // Modular west bunker room
  buildBunker({
    root,
    colliders,
    concrete,
    metal,
    neonOrange,
  });

  // Modular east hangar bay
  buildHangar({
    root,
    colliders,
    dark,
  });

  // Modular cover / crate clusters + barrels + AI anchors
  buildCoverClusters({
    root,
    colliders,
    coverPoints,
    metal,
    rust,
    concrete,
  });

  // Modular raised platform + approach ramp
  buildRampPlatform({
    root,
    colliders,
    floors,
    concrete,
    metal,
  });

  // Modular mid courtyard window-wall
  buildWindowWall({
    root,
    colliders,
    concrete,
    neonCyan,
  });


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


  // Loop 5 — world density: debris, cables, signage, grit (break greybox planes)
  floorDecal(root, 2.8, 1.4, -5, 4, 0x121014, 0.45, 0.7);
  floorDecal(root, 1.8, 3.0, 9, -8, 0x1a1008, 0.38, -0.5);
  floorDecal(root, 5.5, 0.2, 4, 0, 0xff6a3d, 0.22, 0.02);
  floorDecal(root, 0.9, 0.9, -1, -2, 0x0a0a0c, 0.55);
  floorDecal(root, 3.5, 1.2, 15, 2, 0x221808, 0.33, 0.25);
  floorDecal(root, 2.0, 2.0, -12, 8, 0x101208, 0.4);

  // Debris piles (non-colliding clutter, deterministic)
  const debris: Array<[number, number, number, number, number, number, number, boolean]> = [
    [-4.5, 1.6, 0.45, 0.12, 0.35, 0.4, 0.08, true],
    [-4.0, 2.1, 0.35, 0.1, 0.28, -0.3, 0.05, false],
    [-3.8, 1.5, 0.5, 0.14, 0.4, 1.1, -0.1, true],
    [8.2, 6.0, 0.4, 0.1, 0.3, 0.6, 0.12, false],
    [8.7, 6.4, 0.32, 0.09, 0.25, -0.8, -0.05, true],
    [13.2, -4.2, 0.55, 0.15, 0.4, 0.2, 0.1, false],
    [12.7, -3.7, 0.38, 0.11, 0.32, 1.4, -0.15, true],
    [-9.3, 9.2, 0.42, 0.12, 0.3, -0.5, 0.08, false],
    [1.0, -11.2, 0.36, 0.1, 0.28, 0.9, 0.0, true],
    [16.2, 1.1, 0.48, 0.13, 0.36, -1.0, 0.1, false],
  ];
  for (const [x, z, w, h, d, ry, rz, useRust] of debris) {
    const chip = boxMesh(w, h, d, useRust ? rust : concrete, x, 0.08, z, true, true);
    chip.rotation.y = ry;
    chip.rotation.z = rz;
    root.add(chip);
  }

  // Cables / conduits along walls & beams
  const cableMat = createNeonStrip(0x2a3038, 0.15);
  for (const [w, h, d, x, y, z, rx, ry] of [
    [8, 0.04, 0.04, -18, 3.2, -4, 0, 0.1],
    [0.04, 0.04, 10, -13.2, 2.8, -4, 0, 0],
    [12, 0.05, 0.05, 2, 4.6, -7.6, 0, 0],
    [0.05, 0.05, 14, 18, 3.8, -4, 0, 0],
    [6, 0.04, 0.04, 10, 2.2, 4.4, 0, -0.05],
  ] as const) {
    const c = boxMesh(w, h, d, cableMat, x, y, z, false, false);
    c.rotation.x = rx;
    c.rotation.y = ry;
    root.add(c);
  }
  // Sagging cable arcs (segmented)
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = -6 + t * 12;
    const y = 4.4 - Math.sin(t * Math.PI) * 0.7;
    root.add(boxMesh(2.2, 0.035, 0.035, rust, x, y, 6.5, false, false));
  }

  // Signage panels
  const signA = boxMesh(2.4, 1.1, 0.08, dark, -12.6, 2.4, -4, false, true);
  root.add(signA);
  root.add(boxMesh(2.0, 0.15, 0.04, neonOrange, -12.6, 2.75, -3.95, false, false));
  root.add(boxMesh(1.6, 0.5, 0.03, warn, -12.6, 2.25, -3.94, false, false));
  const signB = boxMesh(1.8, 0.9, 0.08, metal, 17.5, 2.6, -11.5, false, true);
  root.add(signB);
  root.add(boxMesh(1.4, 0.12, 0.04, neonCyan, 17.5, 2.9, -11.45, false, false));
  const signC = boxMesh(3.0, 0.7, 0.06, dark, 2, 2.6, -7.7, false, true);
  root.add(signC);
  root.add(boxMesh(2.6, 0.08, 0.03, neonCyan, 2, 2.85, -7.65, false, false));

  // Wall grit / stain decals (vertical planes)
  for (const [w, h, x, y, z, ry, col, op] of [
    [3.5, 2.0, -29.3, 1.8, -8, Math.PI / 2, 0x1a1210, 0.4],
    [2.5, 1.6, 29.3, 2.0, 5, -Math.PI / 2, 0x121418, 0.35],
    [4.0, 1.2, -10, 1.5, -29.3, 0, 0x181410, 0.38],
    [2.2, 2.4, 18, 2.0, -11.55, 0, 0x101820, 0.3],
  ] as const) {
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      transparent: true,
      opacity: op,
      roughness: 0.95,
      metalness: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.renderOrder = 2;
    root.add(m);
  }

  // Loop 6+ — modular control tower piece
  const towerCenter = buildControlTower({
    root,
    scene,
    colliders,
    floors,
    coverPoints,
    dark,
    metal,
    concrete,
    rust,
    lamp,
    warn,
    neonCyan,
    neonOrange,
  });

  // Loop 6 — ammo pickups (glowing crates)
  const ammoPickups: AmmoPickup[] = [];
  const ammoSpots: Array<[number, number, number]> = [
    [0.5, 0, 1.5],
    [towerCenter.x - 1.0, 0, towerCenter.z + 1.0],
    [-14, 0, -2],
    [8, 0, 11],
    [towerCenter.x + 0.5, 3.55, towerCenter.z + 0.5],
  ];
  for (const [ax, ay, az] of ammoSpots) {
    const g = new THREE.Group();
    g.position.set(ax, ay, az);
    const crate = boxMesh(0.55, 0.35, 0.4, metal, 0, 0.2, 0, true, true);
    g.add(crate);
    const glow = boxMesh(0.5, 0.06, 0.35, neonCyan, 0, 0.42, 0, false, false);
    g.add(glow);
    const stripe = boxMesh(0.48, 0.04, 0.04, neonOrange, 0, 0.28, 0.18, false, false);
    g.add(stripe);
    const pl = new THREE.PointLight(0x5ce1ff, 1.8, 4, 2);
    pl.position.set(0, 0.5, 0);
    g.add(pl);
    root.add(g);
    contactBlob(root, ax, az, 0.45, 0.3);
    ammoPickups.push({
      mesh: g,
      position: new THREE.Vector3(ax, ay, az),
      amount: 30,
      taken: false,
    });
  }

  const objectivePoint = towerCenter.clone();


  // --- Lighting punch: darker ambient, hard key, cyan rim, tuned contact shadows ---
  const hemi = new THREE.HemisphereLight(0x6a82a0, 0x0e0c0a, 0.18);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe6c8, 2.55);
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

  return { root, colliders, floors, spawnPoints, coverPoints, ammoPickups, objectivePoint, towerCenter };
}
