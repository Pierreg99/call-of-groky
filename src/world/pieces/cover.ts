import * as THREE from 'three';
import type { CoverPoint } from '../../enemies/target';
import { boxMesh, addCollider, contactBlob } from './helpers';

export interface CoverBuildArgs {
  root: THREE.Group;
  colliders: THREE.Box3[];
  coverPoints: CoverPoint[];
  metal: THREE.Material;
  rust: THREE.Material;
  concrete: THREE.Material;
}

/**
 * Modular cover / crate clusters + barrel props + AI cover anchors.
 * Extracted from arena greybox so density can be reused / re-placed.
 */
export function buildCoverClusters(args: CoverBuildArgs): void {
  const { root, colliders, coverPoints, metal, rust, concrete } = args;

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
    // Stacked small crate on taller covers
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

  // Extra low cover / sandbags / barriers (Loop 5 density)
  const densCovers: Array<[number, number, number, number, number, number, THREE.Material]> = [
    [1.6, 1.1, 0.9, -5, 0.55, 3.5, metal],
    [0.9, 1.5, 1.8, 7.5, 0.75, -1.5, rust],
    [2.4, 0.85, 1.0, 11.5, 0.42, 9, metal],
    [1.2, 1.6, 1.2, -14, 0.8, 2, concrete],
    [1.0, 1.2, 2.4, 3, 0.6, 14, rust],
    [1.8, 1.0, 1.0, -1, 0.5, -10, metal],
  ];
  for (const [w, h, d, x, y, z, mat] of densCovers) {
    const m = boxMesh(w, h, d, mat, x, y, z);
    root.add(m);
    addCollider(colliders, m);
    contactBlob(root, x, z, Math.max(w, d) * 0.5, 0.35);
  }
  coverPoints.push(
    { pos: new THREE.Vector3(-5, 0, 2.2), facing: new THREE.Vector3(0, 0, -1) },
    { pos: new THREE.Vector3(7.5, 0, -3.2), facing: new THREE.Vector3(0, 0, 1) },
    { pos: new THREE.Vector3(11.5, 0, 7.5), facing: new THREE.Vector3(-1, 0, 0) },
    { pos: new THREE.Vector3(3, 0, 12.5), facing: new THREE.Vector3(0, 0, -1) },
  );

  // Barrel props
  for (const [x, z] of [
    [-7.5, 11],
    [15, -5.5],
    [4.5, 13],
    [-15, -6],
  ] as const) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 1.05, 10), rust);
    barrel.position.set(x, 0.52, z);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    root.add(barrel);
    addCollider(colliders, barrel);
    contactBlob(root, x, z, 0.5, 0.35);
  }
}
