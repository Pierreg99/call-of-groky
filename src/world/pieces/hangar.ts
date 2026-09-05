import * as THREE from 'three';
import { boxMesh, addCollider } from './helpers';

export interface HangarBuildArgs {
  root: THREE.Group;
  colliders: THREE.Box3[];
  dark: THREE.Material;
  /** Hangar bay origin-ish (defaults match legacy arena layout). */
  ox?: number;
  oz?: number;
}

/** East hangar bay — back wall, side wall, split front opening. */
export function buildHangar(args: HangarBuildArgs): void {
  const { root, colliders, dark } = args;
  const ox = args.ox ?? 18;
  const oz = args.oz ?? -4;

  const hangarBack = boxMesh(14, 5, 0.7, dark, ox, 2.5, oz - 8);
  root.add(hangarBack);
  addCollider(colliders, hangarBack);

  const hangarSide = boxMesh(0.7, 5, 16, dark, ox + 7, 2.5, oz);
  root.add(hangarSide);
  addCollider(colliders, hangarSide);

  const hangarFrontL = boxMesh(5, 5, 0.7, dark, ox - 6, 2.5, oz + 8);
  root.add(hangarFrontL);
  addCollider(colliders, hangarFrontL);

  const hangarFrontR = boxMesh(5, 5, 0.7, dark, ox + 4, 2.5, oz + 8);
  root.add(hangarFrontR);
  addCollider(colliders, hangarFrontR);
}
