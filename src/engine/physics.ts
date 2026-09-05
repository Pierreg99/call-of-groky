import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { FloorPad } from '../player/fpsController';

/**
 * cannon-es world for player capsule + static arena colliders.
 * Keeps AABB FloorPads for walkable tops that cannon boxes approximate.
 */
export class PhysicsWorld {
  readonly world: CANNON.World;
  private playerBody: CANNON.Body | null = null;
  private readonly groundedContacts = new Set<number>();
  private readonly tmpSize = new THREE.Vector3();
  private readonly tmpCenter = new THREE.Vector3();

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    this.world.defaultContactMaterial.friction = 0.28;
    this.world.defaultContactMaterial.restitution = 0.01;
  }

  /** Static box from a world-space Box3 (arena colliders). */
  addStaticBox3(box: THREE.Box3): CANNON.Body {
    box.getSize(this.tmpSize);
    box.getCenter(this.tmpCenter);
    // Skip degenerate / ultra-thin volumes
    const sx = Math.max(0.05, this.tmpSize.x);
    const sy = Math.max(0.05, this.tmpSize.y);
    const sz = Math.max(0.05, this.tmpSize.z);
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)),
      position: new CANNON.Vec3(this.tmpCenter.x, this.tmpCenter.y, this.tmpCenter.z),
    });
    this.world.addBody(body);
    return body;
  }

  addStaticBoxes(boxes: THREE.Box3[]): void {
    for (const b of boxes) this.addStaticBox3(b);
  }

  /** Invisible ground plane at y=0 covering the arena. */
  addGroundPlane(halfExtent = 40): void {
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    body.position.set(0, 0, 0);
    this.world.addBody(body);
    // Also a thin floor box so cylinder contacts are stable
    const floor = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfExtent, 0.25, halfExtent)),
      position: new CANNON.Vec3(0, -0.25, 0),
    });
    this.world.addBody(floor);
  }

  /** Raised floor pads as static boxes (platforms / decks). */
  addFloorPads(floors: FloorPad[]): void {
    for (const f of floors) {
      const w = Math.max(0.2, f.maxX - f.minX);
      const d = Math.max(0.2, f.maxZ - f.minZ);
      const h = 0.35;
      const cx = (f.minX + f.maxX) / 2;
      const cz = (f.minZ + f.maxZ) / 2;
      const cy = f.topY - h / 2;
      const body = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
        position: new CANNON.Vec3(cx, cy, cz),
      });
      this.world.addBody(body);
    }
  }

  /**
   * Player capsule ≈ cylinder (fixed rotation).
   * `eyeHeight` is camera Y relative to feet; body center sits at mid-capsule.
   */
  addPlayerCapsule(radius: number, eyeHeight: number, pos: THREE.Vector3): CANNON.Body {
    const capsuleH = Math.max(0.9, eyeHeight * 0.92);
    const body = new CANNON.Body({
      mass: 80,
      fixedRotation: true,
      position: new CANNON.Vec3(pos.x, capsuleH / 2, pos.z),
      linearDamping: 0.08,
      angularDamping: 1,
    });
    // cannon-es Cylinder is Y-up by default
    const shape = new CANNON.Cylinder(radius, radius, capsuleH, 12);
    body.addShape(shape);
    body.collisionFilterGroup = 2;
    body.collisionFilterMask = 1 | 2;
    // Ensure statics (group default 1) collide
    for (const b of this.world.bodies) {
      if (b.type === CANNON.Body.STATIC) {
        b.collisionFilterGroup = 1;
        b.collisionFilterMask = 1 | 2;
      }
    }
    this.world.addBody(body);
    this.playerBody = body;

    body.addEventListener('collide', (ev: { contact: CANNON.ContactEquation }) => {
      const contact = ev.contact;
      const other = contact.bi === body ? contact.bj : contact.bi;
      // Contact normal in world: if upward component is strong, feet on ground
      const n = contact.ni;
      const up = contact.bi === body ? -n.y : n.y;
      if (up > 0.45) this.groundedContacts.add(other.id);
    });

    return body;
  }

  getPlayerBody(): CANNON.Body | null {
    return this.playerBody;
  }

  /** True if player had a recent upward contact (cleared each step). */
  consumeGrounded(): boolean {
    const g = this.groundedContacts.size > 0 || this.isNearFloor();
    this.groundedContacts.clear();
    return g;
  }

  private isNearFloor(): boolean {
    if (!this.playerBody) return false;
    // Ray-ish fallback: low vertical speed + near predicted floor
    return this.playerBody.velocity.y >= -0.8 && this.playerBody.position.y < 1.35;
  }

  step(dt: number): void {
    const clamped = Math.min(dt, 1 / 30);
    this.world.step(1 / 60, clamped, 3);
  }
}
