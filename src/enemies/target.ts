import * as THREE from 'three';
import { gameAudio } from '../audio/sfx';

export type EnemyState = 'patrol' | 'chase' | 'shoot' | 'dead';

export interface EnemyShotEvent {
  damage: number;
  from: THREE.Vector3;
}

export class EnemyTarget {
  readonly mesh: THREE.Group;
  readonly id: number;
  health: number;
  maxHealth: number;
  alive = true;
  state: EnemyState = 'patrol';

  private readonly body: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly headMat: THREE.MeshStandardMaterial;
  private readonly eyeMat: THREE.MeshStandardMaterial;
  private deathT = 0;
  private readonly baseY: number;
  private hitFlash = 0;
  private readonly patrolA: THREE.Vector3;
  private readonly patrolB: THREE.Vector3;
  private patrolT = 0;
  private readonly velocity = new THREE.Vector3();
  private shootCool = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly colliders: THREE.Box3[];
  private readonly radius = 0.4;
  private readonly tmpBox = new THREE.Box3();
  private onShotPlayer: ((ev: EnemyShotEvent) => void) | null = null;
  private readonly muzzleFlash: THREE.PointLight;

  constructor(id: number, position: THREE.Vector3, colliders: THREE.Box3[], health = 100) {
    this.id = id;
    this.health = health;
    this.maxHealth = health;
    this.colliders = colliders;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this.baseY = 0;
    this.patrolA = position.clone();
    this.patrolB = position.clone().add(
      new THREE.Vector3((id % 2 === 0 ? 1 : -1) * (2.5 + (id % 3)), 0, ((id * 17) % 5) - 2),
    );
    this.patrolT = id * 0.37;

    this.mat = new THREE.MeshStandardMaterial({
      color: 0x5a3038,
      roughness: 0.65,
      metalness: 0.22,
      emissive: 0x220008,
      emissiveIntensity: 0.3,
      envMapIntensity: 0.55,
    });
    this.headMat = new THREE.MeshStandardMaterial({
      color: 0x7a4048,
      roughness: 0.5,
      metalness: 0.15,
      emissive: 0x330010,
      emissiveIntensity: 0.25,
      envMapIntensity: 0.5,
    });
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      emissive: 0xff2a3a,
      emissiveIntensity: 1.8,
      roughness: 0.3,
      metalness: 0.1,
    });

    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), this.mat);
    this.body.position.y = 1.0;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.mesh.add(this.body);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), this.headMat);
    this.head.position.y = 1.85;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), this.eyeMat);
    eyeL.position.set(-0.1, 1.9, 0.22);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    this.mesh.add(eyeL, eyeR);

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x2a2e34,
      metalness: 0.7,
      roughness: 0.35,
      envMapIntensity: 0.9,
    });
    const padL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.4), padMat);
    padL.position.set(-0.4, 1.45, 0);
    const padR = padL.clone();
    padR.position.x = 0.4;
    this.mesh.add(padL, padR);

    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x1a0508,
        emissive: 0xff3b4a,
        emissiveIntensity: 1.4,
        roughness: 0.4,
      }),
    );
    plate.position.set(0, 1.2, 0.36);
    this.mesh.add(plate);

    // Simple rifle prop
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1a1e24, metalness: 0.8, roughness: 0.4 }),
    );
    gun.position.set(0.35, 1.15, 0.25);
    this.mesh.add(gun);

    this.muzzleFlash = new THREE.PointLight(0xff9955, 0, 5, 2);
    this.muzzleFlash.position.set(0.35, 1.2, 0.55);
    this.mesh.add(this.muzzleFlash);

    this.mesh.userData.enemyId = id;
  }

  setShotCallback(cb: (ev: EnemyShotEvent) => void): void {
    this.onShotPlayer = cb;
  }

  owns(obj: THREE.Object3D): boolean {
    let o: THREE.Object3D | null = obj;
    while (o) {
      if (o === this.mesh || o.userData.enemyId === this.id) return true;
      o = o.parent;
    }
    return false;
  }

  applyDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 1;
    if (this.state === 'patrol') this.state = 'chase';
    if (this.health <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.deathT = 0;
      return true;
    }
    return false;
  }

  update(dt: number, time: number, playerPos: THREE.Vector3, playerAlive: boolean): void {
    this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - dt * 40);

    if (!this.alive) {
      this.deathT += dt;
      this.mesh.rotation.x = THREE.MathUtils.damp(this.mesh.rotation.x, Math.PI / 2, 6, dt);
      this.mesh.position.y = THREE.MathUtils.damp(this.mesh.position.y, this.baseY + 0.2, 4, dt);
      this.mat.opacity = Math.max(0, 1 - this.deathT * 0.5);
      this.mat.transparent = true;
      this.headMat.opacity = this.mat.opacity;
      this.headMat.transparent = true;
      this.eyeMat.emissiveIntensity = 0;
      if (this.deathT > 2.5) this.mesh.visible = false;
      return;
    }

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
      this.mat.emissiveIntensity = 0.3 + this.hitFlash * 1.8;
      this.headMat.emissiveIntensity = 0.25 + this.hitFlash * 1.8;
      this.eyeMat.emissiveIntensity = 1.8 + this.hitFlash * 3;
    }

    const toPlayer = this.tmp.copy(playerPos).sub(this.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    const aggro = 16;
    const shootRange = 11;
    const loseRange = 22;

    if (!playerAlive) {
      this.state = 'patrol';
    } else if (this.state === 'patrol' && dist < aggro) {
      this.state = 'chase';
    } else if ((this.state === 'chase' || this.state === 'shoot') && dist > loseRange) {
      this.state = 'patrol';
    } else if (this.state === 'chase' && dist <= shootRange) {
      this.state = 'shoot';
    } else if (this.state === 'shoot' && dist > shootRange * 1.15) {
      this.state = 'chase';
    }

    switch (this.state) {
      case 'patrol':
        this.patrolT += dt * 0.35;
        {
          const t = (Math.sin(this.patrolT) + 1) * 0.5;
          this.look.copy(this.patrolA).lerp(this.patrolB, t);
          this.moveToward(this.look, 1.4, dt);
          this.faceToward(this.velocity.lengthSq() > 0.01 ? this.velocity : this.look.clone().sub(this.mesh.position), dt);
        }
        break;
      case 'chase':
        this.moveToward(playerPos, 3.2, dt);
        this.faceToward(toPlayer, dt);
        break;
      case 'shoot':
        this.velocity.multiplyScalar(0.85);
        this.faceToward(toPlayer, dt * 1.5);
        this.shootCool -= dt;
        if (this.shootCool <= 0 && playerAlive) {
          this.shootCool = 0.85 + Math.random() * 0.45;
          this.fireAtPlayer(playerPos, dist);
        }
        break;
    }

    this.mesh.position.y = this.baseY + Math.sin(time * 1.5 + this.id) * 0.02;
  }

  private fireAtPlayer(_playerPos: THREE.Vector3, dist: number): void {
    this.muzzleFlash.intensity = 10;
    gameAudio.play('enemyShot', {
      x: this.mesh.position.x,
      y: this.mesh.position.y + 1.2,
      z: this.mesh.position.z,
    });
    // Accuracy falls off with distance; chip damage
    const hitChance = THREE.MathUtils.clamp(1.15 - dist / 14, 0.25, 0.85);
    if (Math.random() > hitChance) return;
    const damage = 5 + Math.floor(Math.random() * 5);
    this.onShotPlayer?.({
      damage,
      from: this.mesh.position.clone().setY(this.mesh.position.y + 1.2),
    });
  }

  private moveToward(target: THREE.Vector3, speed: number, dt: number): void {
    this.look.copy(target).sub(this.mesh.position);
    this.look.y = 0;
    if (this.look.lengthSq() < 0.04) {
      this.velocity.multiplyScalar(0.8);
      return;
    }
    this.look.normalize().multiplyScalar(speed);
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, this.look.x, 6, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, this.look.z, 6, dt);

    const pos = this.mesh.position;
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
    pos.x = THREE.MathUtils.clamp(pos.x, -27, 27);
    pos.z = THREE.MathUtils.clamp(pos.z, -27, 27);
  }

  private faceToward(dir: THREE.Vector3, dt: number): void {
    if (dir.lengthSq() < 1e-6) return;
    const yaw = Math.atan2(dir.x, dir.z);
    let delta = yaw - this.mesh.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.mesh.rotation.y += delta * Math.min(1, dt * 6);
  }

  private hitsWall(pos: THREE.Vector3): boolean {
    const r = this.radius;
    this.tmpBox.min.set(pos.x - r, 0.2, pos.z - r);
    this.tmpBox.max.set(pos.x + r, 1.6, pos.z + r);
    for (const box of this.colliders) {
      if (this.tmpBox.intersectsBox(box)) return true;
    }
    return false;
  }
}

export function createEnemies(
  spawns: THREE.Vector3[],
  colliders: THREE.Box3[],
  count = 4,
): EnemyTarget[] {
  const enemies: EnemyTarget[] = [];
  const n = Math.min(count, spawns.length);
  for (let i = 0; i < n; i++) {
    enemies.push(new EnemyTarget(i + 1, spawns[i].clone(), colliders));
  }
  return enemies;
}
