import * as THREE from 'three';

function makeNoiseTexture(
  size: number,
  fn: (x: number, y: number, i: number) => [number, number, number, number?],
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, b, a = 255] = fn(x, y, i);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createConcreteMaterial(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(128, (x, y) => {
    const n = hash(x, y) * 40 + hash(x * 0.2, y * 0.2) * 30;
    const v = 78 + n;
    return [v, v + 2, v - 2];
  });
  map.repeat.set(4, 4);

  const rough = makeNoiseTexture(64, (x, y) => {
    const v = 140 + hash(x, y) * 80;
    return [v, v, v];
  });
  rough.colorSpace = THREE.NoColorSpace;
  rough.repeat.set(4, 4);

  return new THREE.MeshStandardMaterial({
    color: 0x8a8e93,
    map,
    roughnessMap: rough,
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.35,
  });
}

export function createDarkConcrete(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(128, (x, y) => {
    const n = hash(x + 3, y + 1) * 28;
    const v = 42 + n;
    return [v, v + 1, v + 3];
  });
  map.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({
    color: 0x4a4e55,
    map,
    roughness: 0.88,
    metalness: 0.08,
  });
}

export function createMetalMaterial(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(64, (x, y) => {
    const band = ((x + y * 2) % 8 < 1) ? 30 : 0;
    const v = 110 + hash(x, y) * 40 - band;
    return [v, v + 4, v + 8];
  });
  map.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({
    color: 0x6d7580,
    map,
    roughness: 0.38,
    metalness: 0.86,
    envMapIntensity: 1.0,
  });
}

export function createRustMetal(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x5a4538,
    roughness: 0.72,
    metalness: 0.55,
  });
}

export function createFloorMaterial(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(128, (x, y) => {
    const tile = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
    const n = hash(x, y) * 20;
    const base = tile ? 55 : 48;
    const v = base + n;
    return [v, v, v + 4];
  });
  map.repeat.set(8, 8);
  return new THREE.MeshStandardMaterial({
    color: 0x3a3d44,
    map,
    roughness: 0.85,
    metalness: 0.12,
  });
}

export function createAccentEmissive(color: number, intensity = 1.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.2,
  });
}
