import * as THREE from 'three';
import { gameAudio } from '../audio/sfx';
import type { SoldierAssets } from './gltfAssets';
import { createSoldierRig, type SoldierRig, type SoldierPose } from './soldierRig';

export type EnemyState = 'patrol' | 'chase' | 'shoot' | 'cover' | 'dead';

export interface EnemyShotEvent {
  damage: number;
  from: THREE.Vector3;
}

export interface CoverPoint {
  pos: THREE.Vector3;
  facing: THREE.Vector3;
}

export class EnemyTarget {
  readonly mesh: THREE.Group;
  readonly id: number;
  health: number;
  maxHealth: number;
  alive = true;
  state: EnemyState = 'patrol';

  private readonly bodyMats: THREE.MeshStandardMaterial[] = [];
  private readonly accentMat: THREE.MeshStandardMaterial;
  private deathT = 0;
  private readonly baseY: number;
  private hitFlash = 0;
  private readonly patrolA: THREE.Vector3;
  private readonly patrolB: THREE.Vector3;
  private patrolT = 0;
  private readonly velocity = new THREE.Vector3();
  private shootCool = 0;
  private coverHold = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly colliders: THREE.Box3[];
  private readonly coverPoints: CoverPoint[];
  private activeCover: CoverPoint | null = null;
  private readonly radius = 0.4;
  private readonly tmpBox = new THREE.Box3();
  private onShotPlayer: ((ev: EnemyShotEvent) => void) | null = null;
  private readonly muzzleFlash: THREE.PointLight;
  private readonly muzzleLocal: THREE.Vector3;
  private readonly contactShadow: THREE.Mesh;
  private duckAmount = 0;
  private tookHitRecently = 0;
  private readonly rig: SoldierRig;
  private hitKick = 0;

  constructor(
    id: number,
    position: THREE.Vector3,
    colliders: THREE.Box3[],
    coverPoints: CoverPoint[] = [],
    health = 100,
    assets: SoldierAssets | null = null,
  ) {
    this.id = id;
    this.health = health;
    this.maxHealth = health;
    this.colliders = colliders;
    this.coverPoints = coverPoints;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this.baseY = 0;
    this.patrolA = position.clone();
    this.patrolB = position.clone().add(
      new THREE.Vector3((id % 2 === 0 ? 1 : -1) * (2.5 + (id % 3)), 0, ((id * 17) % 5) - 2),
    );
    this.patrolT = id * 0.37;

    this.accentMat = new THREE.MeshStandardMaterial({
      color: 0x1a0508,
      emissive: 0xff3b4a,
      emissiveIntensity: 1.35,
      roughness: 0.4,
      metalness: 0.2,
    });

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4a3532,
      roughness: 0.78,
      metalness: 0.12,
      emissive: 0x1a0508,
      emissiveIntensity: 0.15,
      envMapIntensity: 0.55,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x2a323c,
      roughness: 0.42,
      metalness: 0.65,
      envMapIntensity: 0.85,
    });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x3e4854,
      roughness: 0.35,
      metalness: 0.72,
      envMapIntensity: 0.95,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x6a5048,
      roughness: 0.7,
      metalness: 0.05,
      envMapIntensity: 0.35,
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x14181c,
      metalness: 0.85,
      roughness: 0.35,
      envMapIntensity: 1.0,
    });

    this.rig = createSoldierRig(assets, {
      body: bodyMat,
      armor: armorMat,
      helmet: helmetMat,
      skin: skinMat,
      accent: this.accentMat,
      gun: gunMat,
    });
    this.mesh.add(this.rig.root);
    this.muzzleLocal = this.rig.muzzleLocal.clone();
    this.bodyMats.push(...this.rig.materials);
    if (!this.bodyMats.includes(this.accentMat)) this.bodyMats.push(this.accentMat);

    this.muzzleFlash = new THREE.PointLight(0xff9955, 0, 5, 2);
    this.muzzleFlash.position.copy(this.muzzleLocal);
    this.mesh.add(this.muzzleFlash);

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    this.contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.02;
    this.contactShadow.renderOrder = 1;
    this.mesh.add(this.contactShadow);

    this.mesh.userData.enemyId = id;
    this.rig.setPose('idle', true);
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
    this.hitKick = 1;
    this.tookHitRecently = 1.8;
    if (this.state === 'patrol') this.state = 'chase';
    if (this.health < this.maxHealth * 0.55 && this.state !== 'cover' && this.coverPoints.length) {
      this.pickCover(this.mesh.position);
      if (this.activeCover) this.state = 'cover';
    }
    if (this.health <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.deathT = 0;
      this.rig.setPose('death', false);
      return true;
    }
    return false;
  }

  update(dt: number, time: number, playerPos: THREE.Vector3, playerAlive: boolean): void {
    this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - dt * 40);
    this.tookHitRecently = Math.max(0, this.tookHitRecently - dt);
    this.hitKick = Math.max(0, this.hitKick - dt * 5);

    if (!this.alive) {
      this.deathT += dt;
      this.rig.applyDeath(dt, this.deathT);
      const op = Math.max(0, 1 - this.deathT * 0.55);
      for (const m of this.bodyMats) {
        m.opacity = op;
        m.transparent = true;
        if (m.emissive) m.emissiveIntensity = Math.min(m.emissiveIntensity, 0.05);
      }
      this.accentMat.emissiveIntensity = 0;
      (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.38 * op;
      if (this.deathT > 2.4) this.mesh.visible = false;
      return;
    }

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 3.5);
      this.accentMat.emissiveIntensity = 1.35 + this.hitFlash * 3.2;
      for (const m of this.bodyMats) {
        if (m !== this.accentMat && m.emissive) {
          m.emissive.setHex(0xff2208);
          m.emissiveIntensity = 0.12 + this.hitFlash * 2.4;
        }
      }
      // Hit flinch lean
      this.mesh.rotation.z = Math.sin(this.hitKick * Math.PI) * 0.12 * this.hitKick;
    } else {
      this.mesh.rotation.z = THREE.MathUtils.damp(this.mesh.rotation.z, 0, 10, dt);
      for (const m of this.bodyMats) {
        if (m !== this.accentMat && m.emissive && m.emissive.getHex() === 0xff2208) {
          m.emissive.setHex(0x1a0508);
          m.emissiveIntensity = 0.15;
        }
      }
    }

    const toPlayer = this.tmp.copy(playerPos).sub(this.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    const aggro = 16;
    const shootRange = 11;
    const loseRange = 22;

    if (!playerAlive) {
      this.state = 'patrol';
      this.activeCover = null;
    } else if (this.state === 'patrol' && dist < aggro) {
      this.state = 'chase';
    } else if ((this.state === 'chase' || this.state === 'shoot' || this.state === 'cover') && dist > loseRange) {
      this.state = 'patrol';
      this.activeCover = null;
    } else if (this.state === 'chase' && dist <= shootRange) {
      if (this.tookHitRecently > 0 && this.coverPoints.length && Math.random() < 0.35) {
        this.pickCover(playerPos);
        if (this.activeCover) this.state = 'cover';
        else this.state = 'shoot';
      } else {
        this.state = 'shoot';
      }
    } else if (this.state === 'shoot' && dist > shootRange * 1.15) {
      this.state = 'chase';
    } else if (this.state === 'cover' && this.coverHold <= 0 && dist < shootRange * 0.85) {
      this.state = 'shoot';
      this.activeCover = null;
    }

    const wantDuck = this.state === 'cover' ? 1 : 0;
    this.duckAmount = THREE.MathUtils.damp(this.duckAmount, wantDuck, 8, dt);
    const duckY = -this.duckAmount * 0.35;

    switch (this.state) {
      case 'patrol':
        this.patrolT += dt * 0.35;
        {
          const t = (Math.sin(this.patrolT) + 1) * 0.5;
          this.look.copy(this.patrolA).lerp(this.patrolB, t);
          this.moveToward(this.look, 1.4, dt);
          this.faceToward(
            this.velocity.lengthSq() > 0.01 ? this.velocity : this.look.clone().sub(this.mesh.position),
            dt,
          );
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
      case 'cover':
        this.coverHold -= dt;
        if (this.activeCover) {
          const cd = this.tmp.copy(this.activeCover.pos).sub(this.mesh.position);
          cd.y = 0;
          if (cd.length() > 0.35) {
            this.moveToward(this.activeCover.pos, 3.6, dt);
          } else {
            this.velocity.multiplyScalar(0.7);
            this.faceToward(toPlayer, dt * 1.2);
            this.shootCool -= dt;
            if (this.shootCool <= 0 && playerAlive && this.duckAmount > 0.6) {
              this.shootCool = 1.1 + Math.random() * 0.5;
              this.fireAtPlayer(playerPos, dist);
            }
          }
        } else {
          this.state = 'chase';
        }
        break;
    }

    const moving = this.velocity.lengthSq() > 0.35;
    let pose: SoldierPose = 'idle';
    if (this.state === 'shoot') pose = 'aim';
    else if (this.state === 'cover') pose = 'cover';
    else if (this.state === 'chase' || (this.state === 'patrol' && moving)) pose = moving ? 'walk' : 'idle';
    this.rig.setPose(pose);
    this.rig.update(dt, time, moving);

    this.mesh.position.y = this.baseY + duckY + Math.sin(time * 1.5 + this.id) * 0.015 * (1 - this.duckAmount);
    this.contactShadow.position.y = 0.02 - duckY;
    (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.32 + this.duckAmount * 0.12;
  }

  private pickCover(threat: THREE.Vector3): void {
    let best: CoverPoint | null = null;
    let bestScore = Infinity;
    for (const c of this.coverPoints) {
      const toCover = c.pos.distanceTo(this.mesh.position);
      const coverToThreat = c.pos.distanceTo(threat);
      const score = toCover * 1.2 + Math.abs(coverToThreat - 6) * 0.4;
      if (toCover < 14 && score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    this.activeCover = best;
    this.coverHold = best ? 2.5 + Math.random() * 1.5 : 0;
  }

  private fireAtPlayer(_playerPos: THREE.Vector3, dist: number): void {
    this.muzzleFlash.intensity = 12;
    this.rig.setPose('fire');
    gameAudio.play('enemyShot', {
      x: this.mesh.position.x,
      y: this.mesh.position.y + 1.2,
      z: this.mesh.position.z,
    });
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

  /** Instant yaw toward world point (capture / wave spawn posing). */
  snapFaceToward(target: THREE.Vector3): void {
    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;
    if (dx * dx + dz * dz < 1e-6) return;
    // +PI: mesh -Z toward target so helmet/gun face camera (beacon sits on +Z)
    this.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;
  }

  snapPose(pose: SoldierPose): void {
    this.rig.setPose(pose, true);
  }

  private faceToward(dir: THREE.Vector3, dt: number): void {
    if (dir.lengthSq() < 1e-6) return;
    const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
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
  coverPoints: CoverPoint[] = [],
  count = 4,
  assets: SoldierAssets | null = null,
): EnemyTarget[] {
  const enemies: EnemyTarget[] = [];
  const n = Math.min(count, spawns.length);
  for (let i = 0; i < n; i++) {
    enemies.push(new EnemyTarget(i + 1, spawns[i].clone(), colliders, coverPoints, 100, assets));
  }
  return enemies;
}

/** Spawn one reinforcement at a world position (wave system). */
export function spawnEnemyAt(
  id: number,
  position: THREE.Vector3,
  colliders: THREE.Box3[],
  coverPoints: CoverPoint[],
  assets: SoldierAssets | null = null,
): EnemyTarget {
  return new EnemyTarget(id, position.clone(), colliders, coverPoints, 100, assets);
}
