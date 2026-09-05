import * as THREE from 'three';
import type { FloorPad } from '../../player/fpsController';
import { boxMesh, addCollider, addFloorPad, contactBlob } from './helpers';

export interface RampBuildArgs {
  root: THREE.Group;
  colliders: THREE.Box3[];
  floors: FloorPad[];
  concrete: THREE.Material;
  metal: THREE.Material;
  /** Platform center X (default -4) */
  px?: number;
  /** Platform center Z (default 18) */
  pz?: number;
}

/**
 * Raised platform + approach ramp with stepped FloorPads for walkability.
 */
export function buildRampPlatform(args: RampBuildArgs): void {
  const { root, colliders, floors, concrete, metal } = args;
  const px = args.px ?? -4;
  const pz = args.pz ?? 18;

  const platform = boxMesh(8, 0.4, 6, concrete, px, 1.4, pz);
  root.add(platform);
  addCollider(colliders, platform);
  addFloorPad(floors, platform);
  contactBlob(root, px, pz, 4.2, 0.25);

  const rampZ = pz - 4.5;
  const ramp = boxMesh(3, 0.35, 5, metal, px, 0.7, rampZ);
  ramp.rotation.x = -0.35;
  root.add(ramp);
  // Visual ramp; walkability via stepped pads (cannon static would block)
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const z = rampZ - 2.2 + t * 4.4;
    const y = 0.35 + t * 1.05;
    floors.push({
      minX: px - 1.4,
      maxX: px + 1.4,
      minZ: z - 0.55,
      maxZ: z + 0.55,
      topY: y,
    });
  }
}
