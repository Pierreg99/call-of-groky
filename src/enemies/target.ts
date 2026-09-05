import * as THREE from 'three';
import { gameAudio } from '../audio/sfx';

export type EnemyState = 'patrol' | 'chase' | 'shoot' | 'cover' | 'dead';

export interface EnemyShotEvent {
  damage: number;
  from: THREE.Vector3;
}

export interface CoverPoint {
  /** Stand / peek position */
  pos: THREE.Vector3;
  /** Facing while in cover (toward expected threat) */
  facing: THREE.Vector3;
}

/** Low-poly soldier silhouette — helmet / armor / limbs, faction contrast */
function buildSoldierMesh(
  bodyMat: THREE.MeshStandardMaterial,
  armorMat: THREE.MeshStandardMaterial,
  helmetMat: THREE.MeshStandardMaterial,
  skinMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  gunMat: THREE.MeshStandardMaterial,
): { root: THREE.Group; muzzleLocal: THREE.Vector3 } {
  const root = new THREE.Group();

  // Boots
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.32), armorMat);
  bootL.position.set(-0.14, 0.06, 0.02);
  bootL.castShadow = true;
  const bootR = bootL.clone();
  bootR.position.x = 0.14;
  root.add(bootL, bootR);

  // Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.22), bodyMat);
  legL.position.set(-0.14, 0.4, 0);
  legL.castShadow = true;
  legL.receiveShadow = true;
  const legR = legL.clone();
  legR.position.x = 0.14;
  root.add(legL, legR);

  // Hips / belt
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.28), armorMat);
  hips.position.set(0, 0.72, 0);
  hips.castShadow = true;
  root.add(hips);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.3), bodyMat);
  torso.position.set(0, 1.1, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  root.add(torso);

  // Chest plate (armor contrast)
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.12), armorMat);
  plate.position.set(0, 1.15, 0.14);
  plate.castShadow = true;
  root.add(plate);

  // Faction stripe on plate
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.02), accentMat);
  stripe.position.set(0, 1.22, 0.21);
  root.add(stripe);

  // Shoulders / pads
  const padL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.28), armorMat);
  padL.position.set(-0.34, 1.38, 0);
  padL.castShadow = true;
  const padR = padL.clone();
  padR.position.x = 0.34;
  root.add(padL, padR);

  // Arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.16), bodyMat);
  armL.position.set(-0.4, 1.05, 0.05);
  armL.rotation.z = 0.12;
  armL.castShadow = true;
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.16), bodyMat);
  armR.position.set(0.38, 1.08, 0.12);
  armR.rotation.x = -0.55;
  armR.rotation.z = -0.08;
  armR.castShadow = true;
  root.add(armL, armR);

  // Neck / head
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), skinMat);
  neck.position.set(0, 1.42, 0);
  root.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.28), skinMat);
  head.position.set(0, 1.58, 0.02);
  head.castShadow = true;
  root.add(head);

  // Helmet — readable silhouette
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.36), helmetMat);
  helmet.position.set(0, 1.72, 0.02);
  helmet.castShadow = true;
  root.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.06, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x0a1014,
      emissive: 0xff2a3a,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.6,
    }),
  );
  visor.position.set(0, 1.66, 0.18);
  root.add(visor);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.1), helmetMat);
  brim.position.set(0, 1.64, 0.18);
  root.add(brim);

  // Backpack pouch (mass / silhouette)
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.14), armorMat);
  pack.position.set(0, 1.15, -0.2);
  pack.castShadow = true;
  root.add(pack);

  // Rifle prop — held across body
  const rifle = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.42), gunMat);
  rifle.add(receiver);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.28, 6), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.32);
  rifle.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.16), gunMat);
  stock.position.set(0, -0.01, 0.26);
  rifle.add(stock);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), gunMat);
  mag.position.set(0, -0.08, 0.02);
  rifle.add(mag);
  rifle.position.set(0.28, 1.12, 0.28);
  rifle.rotation.y = -0.15;
  rifle.rotation.x = 0.08;
  root.add(rifle);

  return { root, muzzleLocal: new THREE.Vector3(0.28, 1.14, 0.55) };
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
  private visorEmissive: THREE.MeshStandardMaterial | null = null;
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

  constructor(
    id: number,
    position: THREE.Vector3,
    colliders: THREE.Box3[],
    coverPoints: CoverPoint[] = [],
    health = 100,
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

    // Faction: hostile crimson / dark olive armor
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4a3532,
      roughness: 0.78,
      metalness: 0.12,
      emissive: 0x1a0508,
      emissiveIntensity: 0.15,
      envMapIntensity: 0.45,
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
    this.accentMat = new THREE.MeshStandardMaterial({
      color: 0x1a0508,
      emissive: 0xff3b4a,
      emissiveIntensity: 1.35,
      roughness: 0.4,
      metalness: 0.2,
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x14181c,
      metalness: 0.85,
      roughness: 0.35,
      envMapIntensity: 1.0,
    });

    this.bodyMats.push(bodyMat, armorMat, helmetMat, skinMat, this.accentMat, gunMat);

    const built = buildSoldierMesh(bodyMat, armorMat, helmetMat, skinMat, this.accentMat, gunMat);
    this.muzzleLocal = built.muzzleLocal;
    // Re-parent soldier parts into this.mesh
    while (built.root.children.length) {
      this.mesh.add(built.root.children[0]);
    }

    // Find visor for hit flash
    this.mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.material) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat.emissive && mat.emissive.getHex() === 0xff2a3a && mat !== this.accentMat) {
        this.visorEmissive = mat;
      }
    });

    this.muzzleFlash = new THREE.PointLight(0xff9955, 0, 5, 2);
    this.muzzleFlash.position.copy(this.muzzleLocal);
    this.mesh.add(this.muzzleFlash);

    // Soft contact blob under feet
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
    this.tookHitRecently = 1.8;
    if (this.state === 'patrol') this.state = 'chase';
    // Seek cover when chewed up
    if (this.health < this.maxHealth * 0.55 && this.state !== 'cover' && this.coverPoints.length) {
      this.pickCover(this.mesh.position);
      if (this.activeCover) this.state = 'cover';
    }
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
    this.tookHitRecently = Math.max(0, this.tookHitRecently - dt);

    if (!this.alive) {
      this.deathT += dt;
      this.mesh.rotation.x = THREE.MathUtils.damp(this.mesh.rotation.x, Math.PI / 2, 6, dt);
      this.mesh.position.y = THREE.MathUtils.damp(this.mesh.position.y, this.baseY + 0.15, 4, dt);
      const op = Math.max(0, 1 - this.deathT * 0.5);
      for (const m of this.bodyMats) {
        m.opacity = op;
        m.transparent = true;
      }
      this.accentMat.emissiveIntensity = 0;
      (this.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.38 * op;
      if (this.deathT > 2.5) this.mesh.visible = false;
      return;
    }

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
      this.accentMat.emissiveIntensity = 1.35 + this.hitFlash * 2.2;
      if (this.visorEmissive) {
        this.visorEmissive.emissiveIntensity = 0.9 + this.hitFlash * 2.5;
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
      // Prefer cover if recently hit and a point is near
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

    // Duck amount for cover
    const wantDuck = this.state === 'cover' ? 1 : 0;
    this.duckAmount = THREE.MathUtils.damp(this.duckAmount, wantDuck, 8, dt);
    const duckY = -this.duckAmount * 0.55;

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
            // Peek-fire while ducked
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
      // Prefer nearby cover that sits between self and threat-ish
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
    this.muzzleFlash.intensity = 10;
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
  coverPoints: CoverPoint[] = [],
  count = 4,
): EnemyTarget[] {
  const enemies: EnemyTarget[] = [];
  const n = Math.min(count, spawns.length);
  for (let i = 0; i < n; i++) {
    enemies.push(new EnemyTarget(i + 1, spawns[i].clone(), colliders, coverPoints));
  }
  return enemies;
}
