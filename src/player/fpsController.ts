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
  private readonly playerRadius = 0.35;
  private readonly tmpBox = new THREE.Box3();
  private readonly tmpVec = new THREE.Vector3();

  bobPhase = 0;
  bobAmount = 0;
  sway = new THREE.Vector2();
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new PointerLockControls(camera, domElement);
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
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
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

  lock(): void {
    this.controls.lock();
  }

  get isLocked(): boolean {
    return this.controls.isLocked;
  }

  takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
  }

  update(dt: number): void {
    const grounded = this.state.grounded;
    this.state.crouching = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    this.state.sprinting =
      !this.state.crouching &&
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.keys.has('KeyW');

    const targetH = this.state.crouching ? this.crouchHeight : this.eyeHeight;
    this.currentHeight = THREE.MathUtils.damp(this.currentHeight, targetH, 12, dt);

    let speed = this.walkSpeed;
    if (this.state.crouching) speed = this.crouchSpeed;
    else if (this.state.sprinting) speed = this.sprintSpeed;

    this.direction.set(0, 0, 0);
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    this.direction.z = forward;
    this.direction.x = right;
    if (this.direction.lengthSq() > 0) this.direction.normalize();

    const accel = grounded ? 18 : 6;
    const targetVelX = this.direction.x * speed;
    const targetVelZ = this.direction.z * speed;

    // Convert local wish dir to world via controls
    const wish = this.tmpVec.set(this.direction.x, 0, this.direction.z);
    if (wish.lengthSq() > 0) {
      wish.applyQuaternion(this.object.quaternion);
      wish.y = 0;
      wish.normalize().multiplyScalar(speed);
    }

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z, accel, dt);

    if (grounded && this.keys.has('Space') && !this.state.crouching) {
      this.velocity.y = this.jumpSpeed;
      this.state.grounded = false;
    }

    this.velocity.y -= this.gravity * dt;

    this.moveWithCollision(dt);

    // Keep eye height relative to floor contact
    if (this.state.grounded) {
      this.object.position.y = this.currentHeight;
    }

    // Weapon bob from horizontal speed
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const bobSpeed = this.state.sprinting ? 14 : 10;
    if (grounded && hSpeed > 0.4) {
      this.bobPhase += dt * bobSpeed * (hSpeed / speed);
      this.bobAmount = THREE.MathUtils.damp(this.bobAmount, 1, 8, dt);
    } else {
      this.bobAmount = THREE.MathUtils.damp(this.bobAmount, 0, 10, dt);
    }

    this.sway.x = THREE.MathUtils.damp(this.sway.x, 0, 8, dt);
    this.sway.y = THREE.MathUtils.damp(this.sway.y, 0, 8, dt);
    this.lastMouseX *= 0.85;
    this.lastMouseY *= 0.85;

    void targetVelX;
    void targetVelZ;
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

  private moveWithCollision(dt: number): void {
    const pos = this.object.position;

    // X
    pos.x += this.velocity.x * dt;
    if (this.hitsWall(pos)) {
      pos.x -= this.velocity.x * dt;
      this.velocity.x = 0;
    }

    // Z
    pos.z += this.velocity.z * dt;
    if (this.hitsWall(pos)) {
      pos.z -= this.velocity.z * dt;
      this.velocity.z = 0;
    }

    // Y
    pos.y += this.velocity.y * dt;
    const floorY = this.currentHeight;
    if (pos.y <= floorY && this.velocity.y <= 0) {
      pos.y = floorY;
      this.velocity.y = 0;
      this.state.grounded = true;
    } else {
      this.state.grounded = false;
    }

    // World bounds soft clamp
    pos.x = THREE.MathUtils.clamp(pos.x, -28, 28);
    pos.z = THREE.MathUtils.clamp(pos.z, -28, 28);
  }

  private hitsWall(pos: THREE.Vector3): boolean {
    const r = this.playerRadius;
    this.tmpBox.set(
      this.tmpVec.set(pos.x - r, 0.2, pos.z - r),
      new THREE.Vector3(pos.x + r, this.currentHeight - 0.1, pos.z + r),
    );
    for (const box of this.colliders) {
      if (this.tmpBox.intersectsBox(box)) return true;
    }
    return false;
  }
}
