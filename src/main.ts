import './style.css';
import * as THREE from 'three';
import { GameRenderer } from './engine/renderer';
import { FpsController } from './player/fpsController';
import { buildArena } from './world/arena';
import { applyEnvironment } from './world/env';
import { CombatEffects } from './combat/effects';
import { Rifle } from './combat/weapon';
import { createEnemies, type EnemyTarget } from './enemies/target';
import { Hud } from './ui/hud';
import { gameAudio } from './audio/sfx';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;

const gfx = new GameRenderer(canvas);
applyEnvironment(gfx.renderer, gfx.scene);

const arena = buildArena(gfx.scene, gfx.quality.shadowMapSize);
const player = new FpsController(gfx.camera, document.body);
player.setColliders(arena.colliders);
player.setFloors(arena.floors);
gfx.scene.add(player.object);

if (!gfx.camera.parent) {
  gfx.scene.add(gfx.camera);
}

const effects = new CombatEffects(gfx.scene);
const weapon = new Rifle(gfx.camera, effects);
weapon.setMotionScale(gfx.motionScale);
const enemies = createEnemies(arena.spawnPoints, arena.colliders, 4);
for (const e of enemies) gfx.scene.add(e.mesh);

const worldTargets: THREE.Object3D[] = [];
arena.root.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) worldTargets.push(o);
});
weapon.setWorldTargets(worldTargets, enemies);

const hud = new Hud();
hud.sync(player, weapon);
hud.setAds(false);

weapon.setCallbacks(
  (enemy: EnemyTarget, killed: boolean) => {
    hud.showHitmarker();
    if (killed) hud.pushKill(String(enemy.id));
  },
  () => hud.sync(player, weapon),
);

for (const e of enemies) {
  e.setShotCallback((ev) => {
    if (!player.isLocked || player.state.health <= 0) return;
    player.takeDamage(ev.damage);
    hud.flashDamage();
    hud.sync(player, weapon);
    gameAudio.play('hit');
  });
}

let firing = false;
let adsHeld = false;
let elapsed = 0;
const clock = new THREE.Clock();
const bob = new THREE.Vector3();

function bindInput(): void {
  startBtn.addEventListener('click', () => {
    gameAudio.ensure();
    player.lock();
  });

  player.controls.addEventListener('lock', () => {
    hud.showOverlay(false);
    gameAudio.ensure();
  });
  player.controls.addEventListener('unlock', () => {
    hud.showOverlay(true);
    firing = false;
    adsHeld = false;
    weapon.setAds(false);
    hud.setAds(false);
  });

  document.addEventListener('mousedown', (e) => {
    if (!player.isLocked) return;
    if (e.button === 0) firing = true;
    if (e.button === 2) {
      adsHeld = true;
      weapon.setAds(true);
      hud.setAds(true);
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) firing = false;
    if (e.button === 2) {
      adsHeld = false;
      weapon.setAds(false);
      hud.setAds(false);
    }
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (!player.isLocked) return;
    if (e.code === 'KeyR') weapon.startReload();
  });
}

function frame(): void {
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;

  const pos = player.object.position;
  gameAudio.setListener(pos.x, pos.y, pos.z);

  if (player.isLocked) {
    player.update(dt);
    weapon.setAds(adsHeld && !weapon.reloading);
    hud.setAds(weapon.adsBlend > 0.5);
    weapon.tryFire(firing, dt);
    gameAudio.updateFootsteps(
      dt,
      player.horizontalSpeed > 0.5,
      player.state.sprinting,
      player.state.grounded,
    );
  }

  player.getBobOffset(bob);
  if (gfx.motionScale < 1) bob.multiplyScalar(gfx.motionScale);
  weapon.update(dt, bob, player.isLocked);
  effects.update(dt);

  const playerAlive = player.state.health > 0;
  for (const e of enemies) e.update(dt, elapsed, pos, playerAlive);

  hud.setFiring(firing && player.isLocked);
  hud.update(dt);

  gfx.render();
  requestAnimationFrame(frame);
}

bindInput();
hud.showOverlay(true);

// Critic capture: ?capture=mid|combat|hud forces camera/HUD for screenshots
const __CAPTURE__ = new URLSearchParams(location.search).get('capture');
if (__CAPTURE__) {
  document.documentElement.classList.add('capture-mode');
  hud.showOverlay(false);
  // Place camera looking into courtyard / hangar
  if (__CAPTURE__ === 'mid') {
    player.object.position.set(0, 1.7, 6);
    gfx.camera.rotation.set(-0.08, 0.35, 0);
  }
  if (__CAPTURE__ === 'combat') {
    player.object.position.set(4, 1.7, 6);
    gfx.camera.rotation.set(-0.12, 0.05, 0);
  }
  if (__CAPTURE__ === 'hud') {
    player.object.position.set(2, 1.7, 4);
    gfx.camera.rotation.set(-0.05, -0.2, 0);
  }
  const steps = __CAPTURE__ === 'combat' ? 30 : 60;
  for (let i = 0; i < steps; i++) {
    const dt = 1 / 30;
    elapsed += dt;
    for (const e of enemies) e.update(dt, elapsed, player.object.position, true);
  }
  if (__CAPTURE__ === 'combat' && enemies[0]) {
    enemies[0].mesh.position.set(5.2, 0, 9.5);
    enemies[0].mesh.rotation.y = Math.PI;
    enemies[0].state = 'shoot';
  }
  (window as unknown as { __COG_READY__?: boolean }).__COG_READY__ = true;
}

requestAnimationFrame(frame);

console.info(
  `%cCall of Groky%c loop2 quality=${gfx.quality.preset} aa=${gfx.quality.postAA} bloom=${gfx.quality.bloom} ssao=${gfx.quality.ssao}`,
  'color:#5ce1ff;font-weight:bold',
  'color:#8899aa',
);
