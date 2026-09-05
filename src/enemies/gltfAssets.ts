import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface SoldierAssets {
  soldierTemplate: THREE.Group;
  rifleTemplate: THREE.Object3D;
  ok: boolean;
}

let cached: SoldierAssets | null = null;
let loading: Promise<SoldierAssets> | null = null;

/** CC0 OGA Casti_131 slim male + assault rifle (~56KB). */
export function loadSoldierAssets(): Promise<SoldierAssets> {
  if (cached) return Promise.resolve(cached);
  if (loading) return loading;
  loading = (async () => {
    const base = import.meta.env.BASE_URL || '/';
    const url = `${base}models/soldier_rifle_cc0.glb`;
    try {
      const gltf = await Promise.race([
        new GLTFLoader().loadAsync(url),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('GLB timeout')), 8000)),
      ]);
      const scene = gltf.scene;
      const rootObj = scene.getObjectByName('SoldierRoot') ?? scene;
      const rifleSrc = scene.getObjectByName('Assault_Rifle');

      rootObj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(rootObj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      if (size.y > 0.2) {
        const s = 1.8 / size.y;
        if (Math.abs(s - 1) > 0.05) rootObj.scale.multiplyScalar(s);
        rootObj.updateMatrixWorld(true);
        box.setFromObject(rootObj);
        box.getCenter(center);
      }
      rootObj.position.x -= center.x;
      rootObj.position.z -= center.z;
      rootObj.position.y -= box.min.y;
      rootObj.updateMatrixWorld(true);

      const soldierTemplate = new THREE.Group();
      soldierTemplate.name = 'SoldierTemplate';
      soldierTemplate.add(rootObj.clone(true));

      let rifleTemplate: THREE.Object3D = new THREE.Group();
      if (rifleSrc) {
        rifleTemplate = rifleSrc.clone(true);
        rifleTemplate.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.frustumCulled = false;
            if (m.material) {
              m.material = Array.isArray(m.material)
                ? m.material.map((x) => x.clone())
                : m.material.clone();
            }
          }
        });
      }

      soldierTemplate.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.castShadow = true;
        m.receiveShadow = true;
        const apply = (mat: THREE.Material): THREE.Material => {
          const std = (mat as THREE.MeshStandardMaterial).clone() as THREE.MeshStandardMaterial;
          const name = (std.name || '').toLowerCase();
          if (name.includes('gear') || name.includes('rifle') || name.includes('weapon')) {
            std.color.setHex(0x4a5562);
            std.metalness = 0.72;
            std.roughness = 0.38;
            std.envMapIntensity = 1.2;
          } else {
            // Fabric / skin tone with subtle sheen from warehouse IBL
            std.color.setHex(0x6a4e42);
            std.metalness = 0.08;
            std.roughness = 0.68;
            std.envMapIntensity = 0.7;
            std.emissive = new THREE.Color(0x140608);
            std.emissiveIntensity = 0.1;
          }
          return std;
        };
        if (Array.isArray(m.material)) m.material = m.material.map(apply);
        else if (m.material) m.material = apply(m.material);
      });

      cached = { soldierTemplate, rifleTemplate, ok: true };
      console.info('[assets] CC0 soldier+rifle GLB ready');
      return cached;
    } catch (err) {
      console.warn('[assets] soldier GLB failed; procedural fallback', err);
      cached = { soldierTemplate: new THREE.Group(), rifleTemplate: new THREE.Group(), ok: false };
      return cached;
    }
  })();
  return loading;
}

export function cloneSoldier(assets: SoldierAssets): THREE.Group {
  const g = assets.soldierTemplate.clone(true);
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    m.material = Array.isArray(m.material)
      ? m.material.map((mat) => mat.clone())
      : m.material.clone();
  });
  return g;
}

export function cloneRifle(assets: SoldierAssets): THREE.Object3D {
  const r = assets.rifleTemplate.clone(true);
  r.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.material) return;
    m.material = Array.isArray(m.material)
      ? m.material.map((mat) => mat.clone())
      : m.material.clone();
  });
  return r;
}
