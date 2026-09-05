import * as THREE from 'three';
import type { FloorPad } from '../../player/fpsController';

/** Shared greybox helpers — modular pieces compose via these. */

export function ensureUv2(geo: THREE.BufferGeometry): void {
  if (!geo.getAttribute('uv2') && geo.getAttribute('uv')) {
    geo.setAttribute('uv2', geo.getAttribute('uv').clone());
  }
}

export function boxMesh(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  cast = true,
  receive = true,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  ensureUv2(geo);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function addCollider(list: THREE.Box3[], mesh: THREE.Mesh): void {
  mesh.updateMatrixWorld(true);
  list.push(new THREE.Box3().setFromObject(mesh));
}

export function addFloorPad(floors: FloorPad[], mesh: THREE.Mesh, inset = 0.05): void {
  mesh.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(mesh);
  floors.push({
    minX: b.min.x + inset,
    maxX: b.max.x - inset,
    minZ: b.min.z + inset,
    maxZ: b.max.z - inset,
    topY: b.max.y,
  });
}

export function contactBlob(root: THREE.Group, x: number, z: number, r: number, opacity = 0.35): void {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.015, z);
  m.renderOrder = 1;
  root.add(m);
}

export function floorDecal(
  root: THREE.Group,
  w: number,
  d: number,
  x: number,
  z: number,
  color: number,
  opacity: number,
  rotY = 0,
): void {
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.95,
    metalness: 0.05,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rotY;
  m.position.set(x, 0.02, z);
  m.receiveShadow = true;
  m.renderOrder = 2;
  root.add(m);
}
