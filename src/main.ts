import './style.css';
import * as THREE from 'three';
import { GameRenderer } from './engine/renderer';
import { FpsController } from './player/fpsController';
import { buildArena } from './world/arena';
import { CombatEffects } from './combat/effects';
import { Rifle } from './combat/weapon';
import { createEnemies, type EnemyTarget } from './enemies/target';
import { Hud } from './ui/hud';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;

const gfx = new GameRenderer(canvas);
const arena = buildArena(gfx.scene);
const player = new FpsController(gfx.camera, document.body);
player.setColliders(arena.colliders);
gfx.scene.add(player.object);

// PointerLockControls in recent three uses the camera as object —
// ensure camera is in scene graph once
if (!gfx.camera.parent) {
  gfx.scene.add(gfx.camera);
}

const effects = new CombatEffects(gfx.scene);
const weapon = new Rifle(gfx.camera, effects);
const enemies = createEnemies(arena.spawnPoints, 4);
for (const e of enemies) gfx.scene.add(e.mesh);

const worldTargets: THREE.Object3D[] = [];
arena.root.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) worldTargets.push(o);
});
weapon.setWorldTargets(worldTargets, enemies);

const hud = new Hud();
hud.sync(player, weapon);

weapon.setCallbacks(
  (enemy: EnemyTarget, killed: boolean) => {
    hud.showHitmarker();
    if (killed) hud.pushKill(String(enemy.id));
  },
  () => hud.sync(player, weapon),
);

let firing = false;
let elapsed = 0;
const clock = new THREE.Clock();
const bob = new THREE.Vector3();

// Dummy threat: occasional chip damage if standing still too long near enemy (keeps HUD alive)
let proximityAcc = 0;

function bindInput(): void {
  startBtn.addEventListener('click', () => {
    player.lock();
  });

  player.controls.addEventListener('lock', () => {
    hud.showOverlay(false);
  });
  player.controls.addEventListener('unlock', () => {
    hud.showOverlay(true);
    firing = false;
  });

  document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && player.isLocked) firing = true;
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) firing = false;
  });
  document.addEventListener('keydown', (e) => {
    if (!player.isLocked) return;
    if (e.code === 'KeyR') weapon.startReload();
  });
}

function updateThreat(dt: number): void {
  let near = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.mesh.position.distanceTo(player.object.position) < 3.5) {
      near = true;
      break;
    }
  }
  if (near) {
    proximityAcc += dt;
    if (proximityAcc > 1.2) {
      proximityAcc = 0;
      player.takeDamage(6);
      hud.flashDamage();
      hud.sync(player, weapon);
    }
  } else {
    proximityAcc = Math.max(0, proximityAcc - dt);
  }
}

function frame(): void {
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;

  if (player.isLocked) {
    player.update(dt);
    weapon.tryFire(firing, dt);
    updateThreat(dt);
  }

  player.getBobOffset(bob);
  weapon.update(dt, bob, player.isLocked);
  effects.update(dt);
  for (const e of enemies) e.update(dt, elapsed);
  hud.setFiring(firing && player.isLocked);
  hud.update(dt);

  gfx.render();
  requestAnimationFrame(frame);
}

bindInput();
hud.showOverlay(true);
requestAnimationFrame(frame);

console.info(
  `%cCall of Groky%c quality=${gfx.quality.preset} dpr=${gfx.quality.pixelRatio}`,
  'color:#5ce1ff;font-weight:bold',
  'color:#8899aa',
);
