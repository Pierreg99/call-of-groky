import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Stronger PMREM bounce than stock RoomEnvironment:
 * dark concrete-toned room + cyan/orange neon panels so PBR metal
 * picks up faction-colored specular instead of flat studio white.
 */
export function applyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new RoomEnvironment() as unknown as THREE.Scene;
  // Dim the baked room lights if present, then add punch panels
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

  // Neon bounce panels (captured into PMREM)
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
  const floorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({
      color: 0x101418,
      emissive: 0x1a3040,
      emissiveIntensity: 0.8,
      roughness: 0.9,
    }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = -0.9;
  envScene.add(floorGlow);

  const env = pmrem.fromScene(envScene, 0.05).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();
  return env;
}
