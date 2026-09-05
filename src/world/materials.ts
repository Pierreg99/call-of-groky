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

export interface PbrMaps {
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
}

export interface WorldPbrBundle {
  floor: PbrMaps;
  wall: PbrMaps;
  metal: PbrMaps;
  rust: PbrMaps;
  ok: boolean;
}

let bundle: WorldPbrBundle | null = null;

function configureMap(
  tex: THREE.Texture,
  repeat: [number, number],
  colorSpace: THREE.ColorSpace,
): THREE.Texture {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  tex.colorSpace = colorSpace;
  tex.needsUpdate = true;
  return tex;
}

async function loadJpg(
  loader: THREE.TextureLoader,
  url: string,
  repeat: [number, number],
  colorSpace: THREE.ColorSpace,
): Promise<THREE.Texture | undefined> {
  try {
    const tex = await Promise.race([
      loader.loadAsync(url),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('tex timeout')), 6000)),
    ]);
    return configureMap(tex, repeat, colorSpace);
  } catch {
    return undefined;
  }
}

/** Preload Poly Haven CC0 1K PBR maps (falls back to procedural if missing). */
export async function loadWorldPbrTextures(): Promise<WorldPbrBundle> {
  if (bundle) return bundle;
  const base = import.meta.env.BASE_URL || '/';
  const loader = new THREE.TextureLoader();
  const srgb = THREE.SRGBColorSpace;
  const linear = THREE.NoColorSpace;

  const floorRep: [number, number] = [8, 8];
  const wallRep: [number, number] = [3, 2];
  const metalRep: [number, number] = [2, 2];
  const rustRep: [number, number] = [2, 2];

  const [
    floorDiff,
    floorNor,
    floorRough,
    floorAo,
    wallDiff,
    wallNor,
    wallRough,
    wallAo,
    metalDiff,
    metalNor,
    metalRough,
    metalAo,
    metalMetal,
    rustDiff,
    rustNor,
    rustRough,
    rustAo,
  ] = await Promise.all([
    loadJpg(loader, `${base}textures/concrete_floor/concrete_floor_worn_001_diff_1k.jpg`, floorRep, srgb),
    loadJpg(loader, `${base}textures/concrete_floor/concrete_floor_worn_001_nor_gl_1k.jpg`, floorRep, linear),
    loadJpg(loader, `${base}textures/concrete_floor/concrete_floor_worn_001_rough_1k.jpg`, floorRep, linear),
    loadJpg(loader, `${base}textures/concrete_floor/concrete_floor_worn_001_ao_1k.jpg`, floorRep, linear),
    loadJpg(loader, `${base}textures/concrete_wall/concrete_wall_007_diff_1k.jpg`, wallRep, srgb),
    loadJpg(loader, `${base}textures/concrete_wall/concrete_wall_007_nor_gl_1k.jpg`, wallRep, linear),
    loadJpg(loader, `${base}textures/concrete_wall/concrete_wall_007_rough_1k.jpg`, wallRep, linear),
    loadJpg(loader, `${base}textures/concrete_wall/concrete_wall_007_ao_1k.jpg`, wallRep, linear),
    loadJpg(loader, `${base}textures/metal_plate/metal_plate_diff_1k.jpg`, metalRep, srgb),
    loadJpg(loader, `${base}textures/metal_plate/metal_plate_nor_gl_1k.jpg`, metalRep, linear),
    loadJpg(loader, `${base}textures/metal_plate/metal_plate_rough_1k.jpg`, metalRep, linear),
    loadJpg(loader, `${base}textures/metal_plate/metal_plate_ao_1k.jpg`, metalRep, linear),
    loadJpg(loader, `${base}textures/metal_plate/metal_plate_metal_1k.jpg`, metalRep, linear),
    loadJpg(loader, `${base}textures/rusty_metal/rusty_metal_02_diff_1k.jpg`, rustRep, srgb),
    loadJpg(loader, `${base}textures/rusty_metal/rusty_metal_02_nor_gl_1k.jpg`, rustRep, linear),
    loadJpg(loader, `${base}textures/rusty_metal/rusty_metal_02_rough_1k.jpg`, rustRep, linear),
    loadJpg(loader, `${base}textures/rusty_metal/rusty_metal_02_ao_1k.jpg`, rustRep, linear),
  ]);

  const ok = !!(floorDiff && wallDiff && metalDiff);
  bundle = {
    floor: { map: floorDiff, normalMap: floorNor, roughnessMap: floorRough, aoMap: floorAo },
    wall: { map: wallDiff, normalMap: wallNor, roughnessMap: wallRough, aoMap: wallAo },
    metal: {
      map: metalDiff,
      normalMap: metalNor,
      roughnessMap: metalRough,
      aoMap: metalAo,
      metalnessMap: metalMetal,
    },
    rust: { map: rustDiff, normalMap: rustNor, roughnessMap: rustRough, aoMap: rustAo },
    ok,
  };
  console.info(`[materials] Poly Haven PBR ${ok ? 'ready' : 'partial/fallback'} (CC0 1K)`);
  return bundle;
}

function applyMaps(
  mat: THREE.MeshStandardMaterial,
  maps: PbrMaps | undefined,
  normalScale = 0.6,
): void {
  if (!maps?.map) return;
  mat.map = maps.map;
  if (maps.normalMap) {
    mat.normalMap = maps.normalMap;
    mat.normalScale = new THREE.Vector2(normalScale, normalScale);
  }
  if (maps.roughnessMap) mat.roughnessMap = maps.roughnessMap;
  if (maps.aoMap) {
    mat.aoMap = maps.aoMap;
    mat.aoMapIntensity = 0.9;
  }
  if (maps.metalnessMap) mat.metalnessMap = maps.metalnessMap;
  mat.needsUpdate = true;
}

export function createConcreteMaterial(): THREE.MeshStandardMaterial {
  const maps = bundle?.wall;
  if (maps?.map) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc8cdd3,
      roughness: 0.92,
      metalness: 0.04,
      envMapIntensity: 0.45,
    });
    applyMaps(mat, maps, 0.55);
    return mat;
  }

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
  const maps = bundle?.wall;
  if (maps?.map) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6a7078,
      roughness: 0.9,
      metalness: 0.06,
      envMapIntensity: 0.35,
    });
    applyMaps(mat, maps, 0.4);
    // Darken via color; share maps
    return mat;
  }

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
  const maps = bundle?.metal;
  if (maps?.map) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xb0b8c2,
      roughness: 0.35,
      metalness: 0.95,
      envMapIntensity: 1.35,
    });
    applyMaps(mat, maps, 0.75);
    return mat;
  }

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
  const maps = bundle?.rust;
  if (maps?.map) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc4a890,
      roughness: 0.78,
      metalness: 0.42,
      envMapIntensity: 0.75,
    });
    applyMaps(mat, maps, 0.65);
    return mat;
  }

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
  const maps = bundle?.floor;
  if (maps?.map) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9aa0a8,
      roughness: 0.88,
      metalness: 0.06,
      envMapIntensity: 0.32,
    });
    applyMaps(mat, maps, 0.5);
    return mat;
  }

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
