import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type * as CANNON from 'cannon-es';
import type { PhysicsWorld } from '../engine/physics';

export interface PlayerState {
  health: number;
  maxHealth: number;
  grounded: boolean;
  crouching: boolean;
  sprinting: boolean;
  velocity: THREE.Vector3;
}

export interface FloorPad {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Walkable top Y in world space */
  topY: number;
}

export class FpsController {
  readonly controls: PointerLockControls;
  readonly object: THREE.Object3D;
  readonly state: PlayerState;

  private readonly velocity = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly keys = new Set<string>();
  private readonly eyeHeight = 1.7;
  private readonly crouchHeight = 1.15;
  private currentHeight = 1.7;
  private jumpSpeed = 7.5;
  private gravity = 22;
  private walkSpeed = 5.2;
  private sprintSpeed = 8.4;
  private crouchSpeed = 2.6;
  private readonly colliders: THREE.Box3[] = [];
  private readonly floors: FloorPad[] = [];
  private readonly playerRadius = 0.35;
  private readonly tmpBox = new THREE.Box3();
  private readonly tmpVec = new THREE.Vector3();
  private floorY = 0;

  bobPhase = 0;
  bobAmount = 0;
  sway = new THREE.Vector2();
  /** Camera roll from strafe (radians), damped. */
  roll = 0;
  /** Sprint FOV blend 0–1 for external compositing. */
  sprintFovBlend = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  /** Look velocity for viewmodel sway feed. */
  lookVel = new THREE.Vector2();
  private landBob = 0;
  private wasGrounded = true;

  /** Soft lock for touch play (no PointerLock API). */
  private touchActive = false;
  /** Normalized stick: x = strafe right, z = forward (−1…1). */
  private touchMoveX = 0;
  private touchMoveZ = 0;
  private touchSprint = false;
  private touchJumpQueued = false;
  private readonly lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  /** Multiplier applied to look (PointerLock + touch) while ADS — set from weapon adsBlend. */
  private adsLookScale = 1;
  private basePointerSpeed = 1;

  /** Optional cannon-es capsule (Boty-parity). */
  private phys: PhysicsWorld | null = null;
  private physBody: CANNON.Body | null = null;
  private capsuleHalf = 0.78;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new PointerLockControls(camera, domElement);
    this.basePointerSpeed = this.controls.pointerSpeed;
    this.object = this.controls.getObject();
    this.object.position.set(0, this.eyeHeight, 8);
    this.state = {
      health: 100,
      maxHealth: 100,
      grounded: true,
      crouching: false,
      sprinting: false,
      velocity: this.velocity,
    };

    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (
        ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight'].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    document.addEventListener('mousemove', (e) => {
      if (!this.controls.isLocked) return;
      this.sway.x += e.movementX * 0.00045;
      this.sway.y += e.movementY * 0.00045;
      this.lookVel.x += e.movementX * 0.0012;
      this.lookVel.y += e.movementY * 0.0012;
      this.lastMouseX = e.movementX;
      this.lastMouseY = e.movementY;
    });
  }

  setColliders(boxes: THREE.Box3[]): void {
    this.colliders.length = 0;
    this.colliders.push(...boxes);
  }

  setFloors(floors: FloorPad[]): void {
    this.floors.length = 0;
    this.floors.push(...floors);
  }

  /** Attach cannon-es player capsule; movement uses physics after this. */
  attachPhysics(phys: PhysicsWorld, body: CANNON.Body): void {
    this.phys = phys;
    this.physBody = body;
    this.capsuleHalf = Math.max(0.5, this.eyeHeight * 0.46);
    body.position.set(this.object.position.x, this.capsuleHalf, this.object.position.z);
  }

  /** Maps 0.3–2.0 UI sensitivity onto PointerLockControls.pointerSpeed */
  setSensitivity(sens: number): void {
    this.basePointerSpeed = Math.max(0.2, Math.min(2.5, sens));
    this.applyPointerSpeed();
  }

  getSensitivity(): number {
    return this.basePointerSpeed;
  }

  /** Scale look while ADS (1 = hip, ~0.4 = ADS). Affects PointerLock + touch look. */
  setAdsLookScale(scale: number): void {
    this.adsLookScale = THREE.MathUtils.clamp(scale, 0.2, 1.2);
    this.applyPointerSpeed();
  }

  private applyPointerSpeed(): void {
    this.controls.pointerSpeed = this.basePointerSpeed * this.adsLookScale;
  }

  lock(): void {
    this.controls.lock();
  }

  /** PointerLock or touch soft-lock — gameplay is active. */
  get isLocked(): boolean {
    return this.controls.isLocked || this.touchActive;
  }

  get isPointerLocked(): boolean {
    return this.controls.isLocked;
  }

  get isTouchActive(): boolean {
    return this.touchActive;
  }

  setTouchActive(on: boolean): void {
    this.touchActive = on;
    if (!on) {
      this.touchMoveX = 0;
      this.touchMoveZ = 0;
      this.touchSprint = false;
      this.touchJumpQueued = false;
    }
  }

  setTouchMove(right: number, forward: number): void {
    this.touchMoveX = THREE.MathUtils.clamp(right, -1, 1);
    this.touchMoveZ = THREE.MathUtils.clamp(forward, -1, 1);
  }

  setTouchSprint(on: boolean): void {
    this.touchSprint = on;
  }

  queueTouchJump(): void {
    this.touchJumpQueued = true;
  }

  /** Apply look delta in screen pixels (PointerLock-equivalent scale). */
  applyTouchLook(dx: number, dy: number): void {
    if (!this.touchActive) return;
    const cam = this.object;
    const speed = 0.002 * this.controls.pointerSpeed;
    this.lookEuler.setFromQuaternion(cam.quaternion);
    this.lookEuler.y -= dx * speed;
    this.lookEuler.x -= dy * speed;
    this.lookEuler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.lookEuler.x));
    cam.quaternion.setFromEuler(this.lookEuler);
    this.sway.x += dx * 0.00045;
    this.sway.y += dy * 0.00045;
    this.lookVel.x += dx * 0.0012;
    this.lookVel.y += dy * 0.0012;
    this.lastMouseX = dx;
    this.lastMouseY = dy;
  }

  get horizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
  }

  update(dt: number): void {
    this.state.crouching = this.keys.has('ControlLeft') || this.keys.has('ControlRight');

    this.direction.set(0, 0, 0);
    const forward =
      Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')) + this.touchMoveZ;
    const right =
      Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.touchMoveX;
    this.direction.z = forward;
    this.direction.x = right;
    if (this.direction.lengthSq() > 0) this.direction.normalize();

    const wantForward = this.direction.z > 0.15 || this.keys.has('KeyW');
    this.state.sprinting =
      !this.state.crouching &&
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchSprint) &&
      wantForward;

    const targetH = this.state.crouching ? this.crouchHeight : this.eyeHeight;
    this.currentHeight = THREE.MathUtils.damp(this.currentHeight, targetH, 12, dt);

    let speed = this.walkSpeed;
    if (this.state.crouching) speed = this.crouchSpeed;
    else if (this.state.sprinting) speed = this.sprintSpeed;

    const wish = this.tmpVec.set(this.direction.x, 0, this.direction.z);
    if (wish.lengthSq() > 0) {
      wish.applyQuaternion(this.object.quaternion);
      wish.y = 0;
      wish.normalize().multiplyScalar(speed);
    }

    const wantJump = this.keys.has('Space') || this.touchJumpQueued;
    this.touchJumpQueued = false;

    if (this.phys && this.physBody) {
      this.updatePhysics(dt, wish, speed, wantJump);
    } else {
      this.updateKinematic(dt, wish, speed, wantJump);
    }

    // Sprint FOV blend (wider hip FOV while sprinting, eased)
    const sprintTarget = this.state.sprinting && this.state.grounded ? 1 : 0;
    this.sprintFovBlend = THREE.MathUtils.damp(this.sprintFovBlend, sprintTarget, 6, dt);

    // Strafe camera roll (subtle cinematic lean)
    const strafe = this.direction.x;
    const rollTarget = -strafe * (this.state.sprinting ? 0.028 : 0.018);
    this.roll = THREE.MathUtils.damp(this.roll, rollTarget, 8, dt);
    // Apply roll on Z (YXZ order) without rewriting pitch/yaw
    this.object.rotation.z = this.roll;

    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const bobSpeed = this.state.sprinting ? 16 : 11;
    if (this.state.grounded && hSpeed > 0.4) {
      this.bobPhase += dt * bobSpeed * (hSpeed / Math.max(speed, 0.1));
      const bobTarget = this.state.sprinting ? 1.35 : this.state.crouching ? 0.55 : 1;
      this.bobAmount = THREE.MathUtils.damp(this.bobAmount, bobTarget, 10, dt);
    } else {
      this.bobAmount = THREE.MathUtils.damp(this.bobAmount, 0, 12, dt);
    }

    // Landing thump
    if (this.state.grounded && !this.wasGrounded) {
      this.landBob = 1;
    }
    this.wasGrounded = this.state.grounded;
    this.landBob = THREE.MathUtils.damp(this.landBob, 0, 14, dt);

    this.sway.x = THREE.MathUtils.damp(this.sway.x, 0, 9, dt);
    this.sway.y = THREE.MathUtils.damp(this.sway.y, 0, 9, dt);
    this.lookVel.x = THREE.MathUtils.damp(this.lookVel.x, 0, 10, dt);
    this.lookVel.y = THREE.MathUtils.damp(this.lookVel.y, 0, 10, dt);
    this.lastMouseX *= 0.85;
    this.lastMouseY *= 0.85;
  }

  private updatePhysics(dt: number, wish: THREE.Vector3, _speed: number, wantJump: boolean): void {
    const body = this.physBody!;
    const phys = this.phys!;
    const grounded =
      phys.consumeGrounded() ||
      (body.velocity.y >= -0.45 && body.position.y < this.capsuleHalf + 0.22);
    this.state.grounded = grounded;

    // Stickier ground accel; slightly more air strafe than kinematic for Boty feel
    const accel = grounded ? 24 : 8.5;
    const vx = THREE.MathUtils.damp(body.velocity.x, wish.x, accel, dt);
    const vz = THREE.MathUtils.damp(body.velocity.z, wish.z, accel, dt);
    body.velocity.x = vx;
    body.velocity.z = vz;

    if (grounded && wantJump && !this.state.crouching) {
      body.velocity.y = this.jumpSpeed;
      this.state.grounded = false;
    }

    phys.step(dt);

    // Sync eye position from capsule center
    const eye = this.currentHeight - this.capsuleHalf;
    this.object.position.set(body.position.x, body.position.y + eye, body.position.z);
    this.velocity.set(body.velocity.x, body.velocity.y, body.velocity.z);

    // Soft arena clamp
    body.position.x = THREE.MathUtils.clamp(body.position.x, -28, 28);
    body.position.z = THREE.MathUtils.clamp(body.position.z, -28, 28);
  }

  private updateKinematic(dt: number, wish: THREE.Vector3, speed: number, wantJump: boolean): void {
    const grounded = this.state.grounded;
    const accel = grounded ? 18 : 6;

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z, accel, dt);

    if (grounded && wantJump && !this.state.crouching) {
      this.velocity.y = this.jumpSpeed;
      this.state.grounded = false;
    }

    this.velocity.y -= this.gravity * dt;
    this.moveWithCollision(dt);

    void speed;
  }

  getBobOffset(out: THREE.Vector3): THREE.Vector3 {
    const a = this.bobAmount;
    const land = this.landBob;
    out.set(
      Math.cos(this.bobPhase * 0.5) * 0.022 * a + this.sway.x * 1.15 + this.lookVel.x * 0.08,
      Math.sin(this.bobPhase) * 0.028 * a -
        Math.abs(this.sway.y) * 0.45 -
        land * 0.04 +
        this.lookVel.y * 0.05,
      Math.sin(this.bobPhase * 0.5) * 0.006 * a,
    );
    return out;
  }

  /** Extra vertical eye bob applied in main (camera local). */
  getEyeBobY(): number {
    return Math.sin(this.bobPhase) * 0.035 * this.bobAmount - this.landBob * 0.055;
  }

  private sampleFloor(x: number, z: number): number {
    let best = 0;
    for (const f of this.floors) {
      if (x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ) {
        if (f.topY > best) best = f.topY;
      }
    }
    return best;
  }

  private moveWithCollision(dt: number): void {
    const pos = this.object.position;

    pos.x += this.velocity.x * dt;
    if (this.hitsWall(pos)) {
      pos.x -= this.velocity.x * dt;
      this.velocity.x = 0;
    }

    pos.z += this.velocity.z * dt;
    if (this.hitsWall(pos)) {
      pos.z -= this.velocity.z * dt;
      this.velocity.z = 0;
    }

    pos.y += this.velocity.y * dt;
    this.floorY = this.sampleFloor(pos.x, pos.z);
    const eyeOnFloor = this.floorY + this.currentHeight;
    if (pos.y <= eyeOnFloor && this.velocity.y <= 0) {
      pos.y = eyeOnFloor;
      this.velocity.y = 0;
      this.state.grounded = true;
    } else {
      this.state.grounded = false;
    }

    pos.x = THREE.MathUtils.clamp(pos.x, -28, 28);
    pos.z = THREE.MathUtils.clamp(pos.z, -28, 28);
  }

  private hitsWall(pos: THREE.Vector3): boolean {
    const r = this.playerRadius;
    const feet = this.floorY + 0.2;
    const head = pos.y - 0.05;
    this.tmpBox.min.set(pos.x - r, feet, pos.z - r);
    this.tmpBox.max.set(pos.x + r, Math.max(feet + 0.1, head), pos.z + r);
    for (const box of this.colliders) {
      if (box.max.y <= this.floorY + 0.15 && box.max.y >= this.floorY - 0.05) continue;
      if (this.tmpBox.intersectsBox(box)) return true;
    }
    return false;
  }
}
