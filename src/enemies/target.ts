import * as THREE from 'three';

export class EnemyTarget {
  readonly mesh: THREE.Group;
  readonly id: number;
  health: number;
  maxHealth: number;
  alive = true;
  private readonly body: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly headMat: THREE.MeshStandardMaterial;
  private deathT = 0;
  private readonly baseY: number;
  private hitFlash = 0;

  constructor(id: number, position: THREE.Vector3, health = 100) {
    this.id = id;
    this.health = health;
    this.maxHealth = health;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this.baseY = position.y;

    this.mat = new THREE.MeshStandardMaterial({
      color: 0x6a3038,
      roughness: 0.7,
      metalness: 0.15,
      emissive: 0x220008,
      emissiveIntensity: 0.25,
    });
    this.headMat = new THREE.MeshStandardMaterial({
      color: 0x8a4850,
      roughness: 0.55,
      metalness: 0.1,
      emissive: 0x330010,
      emissiveIntensity: 0.2,
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

    // Shoulder pads — silhouette
    const padMat = new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.6, roughness: 0.4 });
    const padL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.4), padMat);
    padL.position.set(-0.4, 1.45, 0);
    const padR = padL.clone();
    padR.position.x = 0.4;
    this.mesh.add(padL, padR);

    // ID plate
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xff3b4a }),
    );
    plate.position.set(0, 1.2, 0.36);
    this.mesh.add(plate);

    this.mesh.userData.enemyId = id;
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
    if (this.health <= 0) {
      this.alive = false;
      this.deathT = 0;
      return true;
    }
    return false;
  }

  update(dt: number, time: number): void {
    if (this.alive) {
      this.mesh.position.y = this.baseY + Math.sin(time * 1.5 + this.id) * 0.03;
      this.mesh.rotation.y = Math.sin(time * 0.4 + this.id * 1.7) * 0.15;
      if (this.hitFlash > 0) {
        this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
        this.mat.emissiveIntensity = 0.25 + this.hitFlash * 1.5;
        this.headMat.emissiveIntensity = 0.2 + this.hitFlash * 1.5;
      }
    } else {
      this.deathT += dt;
      this.mesh.rotation.x = THREE.MathUtils.damp(this.mesh.rotation.x, Math.PI / 2, 6, dt);
      this.mesh.position.y = THREE.MathUtils.damp(this.mesh.position.y, this.baseY + 0.2, 4, dt);
      this.mat.opacity = Math.max(0, 1 - this.deathT * 0.5);
      this.mat.transparent = true;
      this.headMat.opacity = this.mat.opacity;
      this.headMat.transparent = true;
      if (this.deathT > 2.5) {
        this.mesh.visible = false;
      }
    }
  }
}

export function createEnemies(spawns: THREE.Vector3[], count = 4): EnemyTarget[] {
  const enemies: EnemyTarget[] = [];
  const n = Math.min(count, spawns.length);
  for (let i = 0; i < n; i++) {
    enemies.push(new EnemyTarget(i + 1, spawns[i].clone()));
  }
  return enemies;
}
