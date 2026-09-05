import * as THREE from 'three';
import { boxMesh, addCollider } from './helpers';

export interface BunkerBuildArgs {
  root: THREE.Group;
  colliders: THREE.Box3[];
  concrete: THREE.Material;
  metal: THREE.Material;
  neonOrange: THREE.Material;
}

/** West bunker room — U walls, doorway lintel, neon door posts. */
export function buildBunker(args: BunkerBuildArgs): void {
  const { root, colliders, concrete, metal, neonOrange } = args;

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

  root.add(boxMesh(0.08, 2.4, 0.08, neonOrange, -13, 1.2, -5.2, false, false));
  root.add(boxMesh(0.08, 2.4, 0.08, neonOrange, -13, 1.2, -2.8, false, false));
}
