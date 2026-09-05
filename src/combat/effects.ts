import * as THREE from 'three';

interface Tracer {
  line: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface Spark {
  mesh: THREE.Points;
  vel: Float32Array;
  life: number;
}

interface Decal {
  mesh: THREE.Mesh;
  life: number;
}

interface Shell {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  ang: THREE.Vector3;
  life: number;
}

interface Blood {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class CombatEffects {
  private readonly scene: THREE.Scene;
  private readonly tracers: Tracer[] = [];
  private readonly sparks: Spark[] = [];
  private readonly decals: Decal[] = [];
  private readonly shells: Shell[] = [];
  private readonly bloods: Blood[] = [];
  private readonly tracerMat: THREE.MeshBasicMaterial;
  private readonly decalMat: THREE.MeshBasicMaterial;
  private readonly sparkMat: THREE.PointsMaterial;
  private readonly shellMat: THREE.MeshStandardMaterial;
  private readonly bloodMat: THREE.MeshBasicMaterial;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tracerMat = new THREE.MeshBasicMaterial({
      color: 0xfff0c0,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.decalMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.sparkMat = new THREE.PointsMaterial({
      color: 0xffcc66,
      size: 0.06,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.bloodMat = new THREE.MeshBasicMaterial({
      color: 0xb01028,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    this.shellMat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      metalness: 0.85,
      roughness: 0.35,
      emissive: 0x332200,
      emissiveIntensity: 0.15,
    });
  }

  spawnTracer(from: THREE.Vector3, to: THREE.Vector3): void {
    const dir = this.tmp2.copy(to).sub(from);
    const len = dir.length();
    if (len < 0.01) return;
    dir.multiplyScalar(1 / len);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.007, 1, 6, 1, true),
      this.tracerMat.clone(),
    );
    mesh.position.copy(from).addScaledVector(dir, len * 0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(this.up, dir);
    this.scene.add(mesh);
    this.tracers.push({ line: mesh, life: 0.1, maxLife: 0.1 });
    // Hot core streak
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.003, 1, 5, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    core.position.copy(mesh.position);
    core.scale.set(1, Math.min(len, 4.5), 1);
    core.quaternion.copy(mesh.quaternion);
    this.scene.add(core);
    this.tracers.push({ line: core, life: 0.06, maxLife: 0.06 });
  }

  spawnImpact(point: THREE.Vector3, normal: THREE.Vector3): void {
    const decal = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), this.decalMat.clone());
    decal.position.copy(point).addScaledVector(normal, 0.012);
    decal.lookAt(this.tmp.copy(point).add(normal));
    this.scene.add(decal);
    this.decals.push({ mesh: decal, life: 10 });
    // Flash disc
    const flash = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffcc88,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flash.position.copy(point).addScaledVector(normal, 0.02);
    flash.lookAt(this.tmp.copy(point).add(normal));
    this.scene.add(flash);
    this.decals.push({ mesh: flash, life: 0.08 });

    const count = 16;
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      const dir = new THREE.Vector3(
        normal.x + (Math.random() - 0.5) * 1.4,
        normal.y + Math.random() * 1.2,
        normal.z + (Math.random() - 0.5) * 1.4,
      ).normalize();
      const sp = 3.2 + Math.random() * 6;
      vel[i * 3] = dir.x * sp;
      vel[i * 3 + 1] = dir.y * sp;
      vel[i * 3 + 2] = dir.z * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparkMat = this.sparkMat.clone();
    sparkMat.size = 0.08;
    const pts = new THREE.Points(geo, sparkMat);
    this.scene.add(pts);
    this.sparks.push({ mesh: pts, vel, life: 0.45 });
  }

  spawnShell(origin: THREE.Vector3, right: THREE.Vector3, forward: THREE.Vector3): void {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 6), this.shellMat);
    mesh.position.copy(origin);
    mesh.castShadow = false;
    const vel = new THREE.Vector3()
      .copy(right)
      .multiplyScalar(2.2 + Math.random() * 1.2)
      .addScaledVector(forward, -0.4 + Math.random() * 0.3)
      .add(new THREE.Vector3(0, 2.5 + Math.random() * 1.2, 0));
    const ang = new THREE.Vector3(
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 18,
    );
    this.scene.add(mesh);
    this.shells.push({ mesh, vel, ang, life: 1.4 });
  }


  /** Stylized impact splash — crimson blot, not gore-heavy. */
  spawnBlood(point: THREE.Vector3, normal: THREE.Vector3): void {
    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const r = 0.05 + Math.random() * 0.12;
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 7), this.bloodMat.clone());
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.15,
      );
      mesh.position.copy(point).addScaledVector(normal, 0.02 + i * 0.005).add(jitter);
      mesh.lookAt(this.tmp.copy(mesh.position).add(normal));
      mesh.rotation.z = Math.random() * Math.PI;
      this.scene.add(mesh);
      this.bloods.push({ mesh, life: 4 + Math.random() * 3, maxLife: 5 });
    }
    // Soft mist points
    const count = 12;
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      const dir = new THREE.Vector3(
        normal.x + (Math.random() - 0.5) * 1.2,
        normal.y + Math.random() * 0.9,
        normal.z + (Math.random() - 0.5) * 1.2,
      ).normalize();
      const sp = 1.2 + Math.random() * 2.5;
      vel[i * 3] = dir.x * sp;
      vel[i * 3 + 1] = dir.y * sp;
      vel[i * 3 + 2] = dir.z * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff3355,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.sparks.push({ mesh: pts, vel, life: 0.28 });
  }

  update(dt: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      const mat = t.line.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (t.life / t.maxLife) * 0.85);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        mat.dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      const pos = s.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let p = 0; p < pos.count; p++) {
        s.vel[p * 3 + 1] -= 9 * dt;
        pos.setXYZ(
          p,
          pos.getX(p) + s.vel[p * 3] * dt,
          pos.getY(p) + s.vel[p * 3 + 1] * dt,
          pos.getZ(p) + s.vel[p * 3 + 2] * dt,
        );
      }
      pos.needsUpdate = true;
      (s.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, s.life / 0.38);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
      }
    }

    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt;
      if (d.life < 1) {
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, d.life);
      }
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this.decals.splice(i, 1);
      }
    }


    for (let i = this.bloods.length - 1; i >= 0; i--) {
      const b = this.bloods[i];
      b.life -= dt;
      if (b.life < 1.2) {
        (b.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (b.life / 1.2) * 0.72);
      }
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bloods.splice(i, 1);
      }
    }

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= dt;
      s.vel.y -= 14 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.ang.x * dt;
      s.mesh.rotation.y += s.ang.y * dt;
      s.mesh.rotation.z += s.ang.z * dt;
      if (s.mesh.position.y < 0.03) {
        s.mesh.position.y = 0.03;
        s.vel.y *= -0.25;
        s.vel.x *= 0.6;
        s.vel.z *= 0.6;
        s.ang.multiplyScalar(0.5);
      }
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.shells.splice(i, 1);
      }
    }
  }
}
