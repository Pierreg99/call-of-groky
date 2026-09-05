import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

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
  private lastMouseX = 0;
  private lastMouseY = 0;

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
      this.sway.x += e.movementX * 0.00035;
      this.sway.y += e.movementY * 0.00035;
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
    // basePointerSpeed already multiplied into pointerSpeed via adsLookScale
    const speed = 0.002 * this.controls.pointerSpeed;
    this.lookEuler.setFromQuaternion(cam.quaternion);
    this.lookEuler.y -= dx * speed;
    this.lookEuler.x -= dy * speed;
    this.lookEuler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.lookEuler.x));
    cam.quaternion.setFromEuler(this.lookEuler);
    this.sway.x += dx * 0.00035;
    this.sway.y += dy * 0.00035;
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
    const grounded = this.state.grounded;
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

    const accel = grounded ? 18 : 6;

    const wish = this.tmpVec.set(this.direction.x, 0, this.direction.z);
    if (wish.lengthSq() > 0) {
      wish.applyQuaternion(this.object.quaternion);
      wish.y = 0;
      wish.normalize().multiplyScalar(speed);
    }

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z, accel, dt);

    const wantJump = this.keys.has('Space') || this.touchJumpQueued;
    if (grounded && wantJump && !this.state.crouching) {
      this.velocity.y = this.jumpSpeed;
      this.state.grounded = false;
    }
    this.touchJumpQueued = false;

    this.velocity.y -= this.gravity * dt;

    this.moveWithCollision(dt);

    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const bobSpeed = this.state.sprinting ? 14 : 10;
    if (this.state.grounded && hSpeed > 0.4) {
      this.bobPhase += dt * bobSpeed * (hSpeed / speed);
      this.bobAmount = THREE.MathUtils.damp(this.bobAmount, 1, 8, dt);
    } else {
      this.bobAmount = THREE.MathUtils.damp(this.bobAmount, 0, 10, dt);
    }

    this.sway.x = THREE.MathUtils.damp(this.sway.x, 0, 8, dt);
    this.sway.y = THREE.MathUtils.damp(this.sway.y, 0, 8, dt);
    this.lastMouseX *= 0.85;
    this.lastMouseY *= 0.85;
  }

  getBobOffset(out: THREE.Vector3): THREE.Vector3 {
    const a = this.bobAmount;
    out.set(
      Math.cos(this.bobPhase * 0.5) * 0.015 * a + this.sway.x,
      Math.sin(this.bobPhase) * 0.02 * a - Math.abs(this.sway.y) * 0.4,
      0,
    );
    return out;
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
      // Ignore boxes whose top is a walkable floor under our feet
      if (box.max.y <= this.floorY + 0.15 && box.max.y >= this.floorY - 0.05) continue;
      if (this.tmpBox.intersectsBox(box)) return true;
    }
    return false;
  }
}
