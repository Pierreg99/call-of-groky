import * as THREE from 'three';

interface Tracer {
  line: THREE.Line;
  life: number;
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

export class CombatEffects {
  private readonly scene: THREE.Scene;
  private readonly tracers: Tracer[] = [];
  private readonly sparks: Spark[] = [];
  private readonly decals: Decal[] = [];
  private readonly tracerMat: THREE.LineBasicMaterial;
  private readonly decalMat: THREE.MeshBasicMaterial;
  private readonly sparkMat: THREE.PointsMaterial;
  private readonly tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tracerMat = new THREE.LineBasicMaterial({
      color: 0xffe5a0,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
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
  }

  spawnTracer(from: THREE.Vector3, to: THREE.Vector3): void {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const line = new THREE.Line(geo, this.tracerMat.clone());
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
  }

  spawnImpact(point: THREE.Vector3, normal: THREE.Vector3): void {
    // Decal
    const decal = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), this.decalMat.clone());
    decal.position.copy(point).addScaledVector(normal, 0.01);
    decal.lookAt(this.tmp.copy(point).add(normal));
    this.scene.add(decal);
    this.decals.push({ mesh: decal, life: 8 });

    // Sparks
    const count = 10;
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
      const sp = 2 + Math.random() * 4;
      vel[i * 3] = dir.x * sp;
      vel[i * 3 + 1] = dir.y * sp;
      vel[i * 3 + 2] = dir.z * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, this.sparkMat.clone());
    this.scene.add(pts);
    this.sparks.push({ mesh: pts, vel, life: 0.35 });
  }

  update(dt: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      const mat = t.line.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, t.life / 0.08);
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
      (s.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, s.life / 0.35);
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
  }
}
