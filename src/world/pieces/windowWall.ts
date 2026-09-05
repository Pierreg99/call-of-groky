import * as THREE from 'three';
import { boxMesh, addCollider, contactBlob } from './helpers';

export interface WindowWallBuildArgs {
  root: THREE.Group;
  colliders: THREE.Box3[];
  concrete: THREE.Material;
  neonCyan: THREE.Material;
  /** Main mid-wall center X (default 2) */
  cx?: number;
  /** Wall Z (default -8) */
  cz?: number;
}

/**
 * Mid courtyard window-wall: long panel + side gap segment + neon crown.
 * Leaves a doorway/window gap between the long wall and the west stub.
 */
export function buildWindowWall(args: WindowWallBuildArgs): void {
  const { root, colliders, concrete, neonCyan } = args;
  const cx = args.cx ?? 2;
  const cz = args.cz ?? -8;

  const midWall = boxMesh(12, 2.2, 0.5, concrete, cx, 1.1, cz);
  root.add(midWall);
  addCollider(colliders, midWall);
  contactBlob(root, cx, cz, 6, 0.3);

  const midGapL = boxMesh(3, 2.2, 0.5, concrete, cx - 10, 1.1, cz);
  root.add(midGapL);
  addCollider(colliders, midGapL);

  // Neon crown along the long panel
  root.add(boxMesh(11.5, 0.05, 0.08, neonCyan, cx, 2.25, cz, false, false));

  // Window sill / lintel accents on the gap edge (visual only)
  root.add(boxMesh(0.55, 0.12, 0.55, neonCyan, cx - 4.2, 2.15, cz, false, false));
  root.add(boxMesh(0.55, 0.12, 0.55, neonCyan, cx - 8.5, 2.15, cz, false, false));
  // Thin vertical frame posts at the window opening
  root.add(boxMesh(0.12, 2.0, 0.12, concrete, cx - 4.05, 1.1, cz + 0.05, true, true));
  root.add(boxMesh(0.12, 2.0, 0.12, concrete, cx - 8.65, 1.1, cz + 0.05, true, true));
}
