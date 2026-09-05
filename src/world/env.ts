import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Real HDRI (Poly Haven Empty Warehouse 01, CC0) via RGBELoader + PMREM.
 * Stronger indirect bounce than Loop 3 RoomEnvironment hack.
 * Falls back to neon-tinted room PMREM if the HDR fails to load.
 */
export async function applyEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
): Promise<THREE.Texture> {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const base = import.meta.env.BASE_URL || '/';
  const hdrUrl = `${base}hdri/empty_warehouse_01_1k.hdr`;

  try {
    const loader = new RGBELoader();
    const hdr = await Promise.race([
      loader.loadAsync(hdrUrl),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('HDRI timeout')), 8000)),
    ]);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    scene.environment = env;
    // Bake feel: stronger indirect so metal / armor pick up warehouse bounce
    scene.environmentIntensity = 1.15;
    // Keep fog engagement-tuned solid background (no full skybox wash)
    pmrem.dispose();
    console.info('[env] Poly Haven empty_warehouse_01_1k HDRI + PMREM');
    return env;
  } catch (err) {
    console.warn('[env] HDRI load failed, falling back to RoomEnvironment', err);
    return applyRoomFallback(pmrem, scene);
  }
}

function applyRoomFallback(pmrem: THREE.PMREMGenerator, scene: THREE.Scene): THREE.Texture {
  const envScene = new RoomEnvironment() as unknown as THREE.Scene;
  envScene.traverse((o) => {
    const l = o as THREE.Light;
    if ((l as THREE.Light).isLight) {
      l.intensity *= 0.45;
    }
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material) {
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat.color) mat.color.setHex(0x2a3038);
      if (mat.roughness !== undefined) mat.roughness = 0.85;
    }
  });

  const cyan = new THREE.MeshStandardMaterial({
    color: 0x0a1218,
    emissive: 0x5ce1ff,
    emissiveIntensity: 3.2,
    roughness: 0.4,
  });
  const orange = new THREE.MeshStandardMaterial({
    color: 0x120a08,
    emissive: 0xff6a3d,
    emissiveIntensity: 2.6,
    roughness: 0.4,
  });
  const panelC = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), cyan);
  panelC.position.set(-3.5, 1.5, -2);
  panelC.rotation.y = 0.6;
  envScene.add(panelC);
  const panelO = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2), orange);
  panelO.position.set(3.2, 1.2, 1.5);
  panelO.rotation.y = -0.8;
  envScene.add(panelO);

  const env = pmrem.fromScene(envScene, 0.05).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.7;
  pmrem.dispose();
  return env;
}
