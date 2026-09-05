import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** PMREM from RoomEnvironment — cheap generated cubemap for PBR reflections */
export function applyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  pmrem.dispose();
  return env;
}
