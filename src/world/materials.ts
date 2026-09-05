import * as THREE from 'three';

function makeNoiseTexture(
  size: number,
  fn: (x: number, y: number, i: number) => [number, number, number, number?],
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
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
  tex.colorSpace = colorSpace;
  tex.anisotropy = 4;
  return tex;
}

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0);
  const b = hash(x0 + 1, y0);
  const c = hash(x0, y0 + 1);
  const d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number): number {
  let a = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    a += valueNoise(x * f, y * f) * amp;
    amp *= 0.5;
    f *= 2;
  }
  return a;
}

/** Procedural tangent-ish normal map from height noise */
function makeNormalMap(size: number, scale = 1.6): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const strength = 2.8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8 * scale;
      const v = (y / size) * 8 * scale;
      const hL = fbm(u - 0.05, v);
      const hR = fbm(u + 0.05, v);
      const hD = fbm(u, v - 0.05);
      const hU = fbm(u, v + 0.05);
      let nx = (hL - hR) * strength;
      let ny = (hD - hU) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      data[i] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[i + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createConcreteMaterial(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(128, (x, y) => {
    const n = fbm(x * 0.12, y * 0.12) * 55 + hash(x, y) * 18;
    const crack = fbm(x * 0.4, y * 0.4) > 0.72 ? -18 : 0;
    const v = 72 + n + crack;
    return [v, v + 3, v - 1];
  });
  map.repeat.set(4, 4);

  const rough = makeNoiseTexture(
    64,
    (x, y) => {
      const v = 120 + fbm(x * 0.2, y * 0.2) * 100 + hash(x, y) * 30;
      return [v, v, v];
    },
    THREE.NoColorSpace,
  );
  rough.repeat.set(4, 4);

  const normalMap = makeNormalMap(128, 1.4);
  normalMap.repeat.set(4, 4);

  return new THREE.MeshStandardMaterial({
    color: 0x8a8e93,
    map,
    roughnessMap: rough,
    normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.94,
    metalness: 0.03,
    envMapIntensity: 0.4,
  });
}

export function createDarkConcrete(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(128, (x, y) => {
    const n = fbm(x * 0.1 + 3, y * 0.1 + 1) * 36;
    const v = 38 + n;
    return [v, v + 1, v + 4];
  });
  map.repeat.set(2, 2);
  const normalMap = makeNormalMap(96, 1.1);
  normalMap.repeat.set(2, 2);
  const rough = makeNoiseTexture(
    64,
    (x, y) => {
      const v = 150 + hash(x + 9, y) * 70;
      return [v, v, v];
    },
    THREE.NoColorSpace,
  );
  return new THREE.MeshStandardMaterial({
    color: 0x3e434b,
    map,
    roughnessMap: rough,
    normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.9,
    metalness: 0.06,
    envMapIntensity: 0.3,
  });
}

export function createMetalMaterial(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(64, (x, y) => {
    const band = (x + y * 2) % 8 < 1 ? 35 : 0;
    const scratch = hash(x * 3, y) > 0.92 ? 40 : 0;
    const v = 105 + hash(x, y) * 45 - band + scratch;
    return [v, v + 5, v + 10];
  });
  map.repeat.set(2, 2);
  const rough = makeNoiseTexture(
    64,
    (x, y) => {
      const v = 60 + hash(x, y) * 90 + ((x + y) % 8 < 1 ? 40 : 0);
      return [v, v, v];
    },
    THREE.NoColorSpace,
  );
  rough.repeat.set(2, 2);
  const normalMap = makeNormalMap(64, 2.2);
  normalMap.repeat.set(3, 3);
  return new THREE.MeshStandardMaterial({
    color: 0x7a8490,
    map,
    roughnessMap: rough,
    normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.32,
    metalness: 0.92,
    envMapIntensity: 1.25,
  });
}

export function createRustMetal(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(64, (x, y) => {
    const rust = fbm(x * 0.25, y * 0.25);
    const r = 90 + rust * 50;
    const g = 55 + rust * 20;
    const b = 40 + hash(x, y) * 15;
    return [r, g, b];
  });
  map.repeat.set(2, 2);
  const rough = makeNoiseTexture(
    64,
    (x, y) => {
      const v = 140 + fbm(x * 0.2, y * 0.2) * 90;
      return [v, v, v];
    },
    THREE.NoColorSpace,
  );
  return new THREE.MeshStandardMaterial({
    color: 0x6a4e3c,
    map,
    roughnessMap: rough,
    roughness: 0.78,
    metalness: 0.48,
    envMapIntensity: 0.7,
  });
}

export function createFloorMaterial(): THREE.MeshStandardMaterial {
  const map = makeNoiseTexture(128, (x, y) => {
    const tile = (Math.floor(x / 16) + Math.floor(y / 16)) % 2;
    const n = fbm(x * 0.15, y * 0.15) * 22;
    const grout = x % 16 < 1 || y % 16 < 1 ? -14 : 0;
    const stain = fbm(x * 0.05 + 2, y * 0.05 + 4) > 0.68 ? -10 : 0;
    const base = tile ? 48 : 38;
    const v = base + n + grout + stain;
    const grit = hash(x, y) * 14;
    return [v + grit * 0.15, v - 2, v + 4];
  });
  map.repeat.set(10, 10);
  const normalMap = makeNormalMap(128, 2.1);
  normalMap.repeat.set(10, 10);
  const rough = makeNoiseTexture(
    64,
    (x, y) => {
      const seam = x % 16 < 1 || y % 16 < 1 ? 40 : 0;
      const v = 170 + hash(x, y) * 55 + seam;
      return [v, v, v];
    },
    THREE.NoColorSpace,
  );
  rough.repeat.set(10, 10);
  const ao = makeNoiseTexture(
    64,
    (x, y) => {
      // Soft corner darkening per tile for fake AO
      const fx = (x % 16) / 16;
      const fy = (y % 16) / 16;
      const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
      const v = 140 + edge * 90 + hash(x, y) * 15;
      return [v, v, v];
    },
    THREE.NoColorSpace,
  );
  ao.repeat.set(10, 10);
  return new THREE.MeshStandardMaterial({
    color: 0x2c3036,
    map,
    roughnessMap: rough,
    aoMap: ao,
    aoMapIntensity: 0.85,
    normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.9,
    metalness: 0.08,
    envMapIntensity: 0.28,
  });
}

export function createAccentEmissive(color: number, intensity = 1.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.25,
    envMapIntensity: 0.5,
  });
}

export function createNeonStrip(color: number, intensity = 2.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x101418,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.25,
    metalness: 0.4,
  });
}
